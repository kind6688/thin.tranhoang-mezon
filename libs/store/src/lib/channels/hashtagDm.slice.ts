import { captureSentryError } from '@mezon/logger';
import { LoadingStatus } from '@mezon/utils';
import { EntityState, PayloadAction, createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { HashtagDm } from 'mezon-js';
import { CacheMetadata, createApiKey, createCacheMetadata, markApiFirstCalled, shouldForceApiCall } from '../cache-metadata';
import { MezonValueContext, ensureClient, getMezonCtx } from '../helpers';
import { RootState } from '../store';

export interface HashtagDmState extends EntityState<HashtagDm, string> {
	byDirectIds: Record<
		string,
		{
			loadingStatus: LoadingStatus;
			cache?: CacheMetadata;
		}
	>;
	loadingStatus: LoadingStatus;
	error?: string | null;
}

export const HashtagDmAdapter = createEntityAdapter({
	selectId: (channel: HashtagDm) => channel.channel_id || ''
});

const HASHTAG_DM_CACHE_TIME = 1000 * 60 * 60; // 1 hour

const getInitialDirectState = () => ({
	loadingStatus: 'not loaded' as LoadingStatus
});

type fetchHashtagDmArgs = {
	userIds: string[];
	limit?: number;
	directId: string;
	noCache?: boolean;
};

export const fetchHashtagDmCached = async (
	getState: () => RootState,
	mezon: MezonValueContext,
	userIds: string[],
	directId: string,
	noCache = false
) => {
	const currentState = getState();
	const directData = currentState['hashtagdm'].byDirectIds[directId];
	const sortedUserIds = [...userIds].sort();
	const apiKey = createApiKey('fetchHashtagDm', directId, sortedUserIds.join(','));

	const shouldForceCall = shouldForceApiCall(apiKey, directData?.cache, noCache);

	if (!shouldForceCall) {
		return {
			fromCache: true,
			time: directData.cache?.lastFetched || Date.now()
		};
	}

	const response = await mezon.client.hashtagDMList(mezon.session, userIds, 500);

	markApiFirstCalled(apiKey);

	return {
		...response,
		fromCache: false,
		time: Date.now()
	};
};

export const fetchHashtagDm = createAsyncThunk('channels/fetchHashtagDm', async ({ userIds, directId, noCache }: fetchHashtagDmArgs, thunkAPI) => {
	try {
		const mezon = await ensureClient(getMezonCtx(thunkAPI));

		const response = await fetchHashtagDmCached(thunkAPI.getState as () => RootState, mezon, userIds, directId, Boolean(noCache));

		if (response.fromCache) {
			return {
				fromCache: true,
				directId,
				hashtag_dm: []
			};
		}

		if (!response?.hashtag_dm) {
			return {
				fromCache: response.fromCache,
				directId,
				hashtag_dm: []
			};
		}

		return {
			fromCache: response.fromCache,
			directId,
			hashtag_dm: response.hashtag_dm.map((dm: HashtagDm) => ({
				...dm,
				id: dm.channel_id
			}))
		};
	} catch (error) {
		captureSentryError(error, 'channels/fetchHashtagDm');
		return thunkAPI.rejectWithValue(error);
	}
});

export const initialHashtagDmState: HashtagDmState = HashtagDmAdapter.getInitialState({
	byDirectIds: {},
	loadingStatus: 'not loaded',
	error: null
});

export const hashtagDmSlice = createSlice({
	name: 'hashtagdm',
	initialState: initialHashtagDmState,
	reducers: {
		updateHashtagDmCache: (state, action: PayloadAction<{ directId: string }>) => {
			const { directId } = action.payload;
			if (!state.byDirectIds[directId]) {
				state.byDirectIds[directId] = getInitialDirectState();
			}
			state.byDirectIds[directId].cache = createCacheMetadata(HASHTAG_DM_CACHE_TIME);
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchHashtagDm.pending, (state: HashtagDmState, action) => {
				const directId = action.meta.arg.directId;
				if (!state.byDirectIds[directId]) {
					state.byDirectIds[directId] = { loadingStatus: 'loading' };
				} else {
					state.byDirectIds[directId].loadingStatus = 'loading';
				}
				state.loadingStatus = 'loading';
			})
			.addCase(fetchHashtagDm.fulfilled, (state: HashtagDmState, action) => {
				const { directId, fromCache, hashtag_dm } = action.payload;

				if (!state.byDirectIds[directId]) {
					state.byDirectIds[directId] = { loadingStatus: 'loaded' };
				} else {
					state.byDirectIds[directId].loadingStatus = 'loaded';
				}

				if (!fromCache) {
					HashtagDmAdapter.setAll(state, hashtag_dm);
					state.byDirectIds[directId].cache = createCacheMetadata(HASHTAG_DM_CACHE_TIME);
				}

				state.loadingStatus = 'loaded';
			})
			.addCase(fetchHashtagDm.rejected, (state: HashtagDmState, action) => {
				const directId = action.meta.arg.directId;
				if (!state.byDirectIds[directId]) {
					state.byDirectIds[directId] = { loadingStatus: 'error' };
				} else {
					state.byDirectIds[directId].loadingStatus = 'error';
				}
				state.loadingStatus = 'error';
				state.error = action.error.message;
			});
	}
});

export const hashtagDmReducer = hashtagDmSlice.reducer;

export const hashtagDmActions = { ...hashtagDmSlice.actions, fetchHashtagDm };

const { selectAll, selectEntities, selectById } = HashtagDmAdapter.getSelectors();

export const gethashtagDmState = (rootState: { ['hashtagdm']: HashtagDmState }): HashtagDmState => rootState['hashtagdm'];

export const selectAllHashtagDm = createSelector(gethashtagDmState, selectAll);

export const selectHashtagDmEntities = createSelector(gethashtagDmState, selectEntities);

export const selectHashtagDmById = createSelector([gethashtagDmState, (state, id: string) => id], (state, id) => {
	const hashtag = selectById(state, id);
	return { ...hashtag, id: hashtag?.channel_id || '' };
});
