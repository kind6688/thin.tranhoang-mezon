import { LoadingStatus } from '@mezon/utils';
import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, EntityState } from '@reduxjs/toolkit';

import { captureSentryError } from '@mezon/logger';
import { ApiChannelSettingItem } from 'mezon-js/dist/api.gen';
import { CacheMetadata, createApiKey, createCacheMetadata, markApiFirstCalled, shouldForceApiCall } from '../cache-metadata';
import { ensureSession, getMezonCtx, MezonValueContext } from '../helpers';
import { RootState } from '../store';

export const SETTING_CLAN_CHANNEL = 'settingClanChannel';

export interface SettingClanChannelState extends EntityState<ApiChannelSettingItem, string> {
	loadingStatus: LoadingStatus;
	error?: string | null;
	channelCount: number;
	threadCount: number;
	threadsByChannel: Record<string, ApiChannelSettingItem[]>;
	listSearchChannel: ApiChannelSettingItem[];
	cache?: CacheMetadata;
}

export const channelSettingAdapter = createEntityAdapter({
	selectId: (channel: ApiChannelSettingItem) => channel.id || ''
});

export const initialSettingClanChannelState: SettingClanChannelState = channelSettingAdapter.getInitialState({
	loadingStatus: 'not loaded',
	error: null,
	channelCount: 0,
	threadCount: 0,
	threadsByChannel: {},
	listSearchChannel: []
});

export enum ETypeFetchChannelSetting {
	FETCH_CHANNEL = 'FETCH_CHANNEL',
	MORE_CHANNEL = 'MORE_CHANNEL',
	FETCH_THREAD = 'FETCH_THREAD',
	SEARCH_CHANNEL = 'SEARCH_CHANNEL'
}

export const fetchChannelSettingInClanCached = async (
	getState: () => RootState,
	mezon: MezonValueContext,
	clanId: string,
	parentId: string,
	page: number,
	limit: number,
	channel_label: string,
	noCache = false
) => {
	const currentState = getState();
	const channelSettingState = currentState[SETTING_CLAN_CHANNEL];
	const apiKey = createApiKey('fetchChannelSettingInClan', clanId, parentId, page, limit, channel_label);

	const shouldForceCall = shouldForceApiCall(apiKey, channelSettingState.cache, noCache);

	if (!shouldForceCall) {
		return {
			channel_setting_list: Object.values(channelSettingState.entities),
			channel_count: channelSettingState.channelCount,
			thread_count: channelSettingState.threadCount,
			fromCache: true,
			time: channelSettingState.cache?.lastFetched || Date.now()
		};
	}

	const response = await mezon.client.getChannelSettingInClan(
		mezon.session,
		clanId,
		parentId, // parent_id
		undefined, // category_id
		undefined, // private_channel
		undefined, // active
		undefined, // status
		undefined, // type
		limit, // limit
		page,
		channel_label // keyword search
	);

	markApiFirstCalled(apiKey);

	return {
		...response,
		fromCache: false,
		time: Date.now()
	};
};

interface IFetchChannelSetting {
	noCache?: boolean;
	clanId: string;
	parentId: string;
	page?: number;
	limit?: number;
	typeFetch: ETypeFetchChannelSetting;
	keyword?: string;
}

export const fetchChannelSettingInClan = createAsyncThunk(
	'channelSetting/fetchClanChannelSetting',
	async ({ noCache = false, clanId, parentId, page = 1, limit = 10, typeFetch, keyword }: IFetchChannelSetting, thunkAPI) => {
		try {
			const mezon = await ensureSession(getMezonCtx(thunkAPI));

			const response = await fetchChannelSettingInClanCached(
				thunkAPI.getState as () => RootState,
				mezon,
				clanId,
				parentId,
				page,
				limit,
				keyword || '',
				Boolean(noCache)
			);

			if (!response) {
				return thunkAPI.rejectWithValue('Invalid fetchChannelSettingInClan');
			}

			if (response.fromCache) {
				return {
					fromCache: true,
					parentId,
					typeFetch
				};
			}

			return {
				parentId: parentId,
				response: response,
				typeFetch
			};
		} catch (error) {
			captureSentryError(error, 'channelSetting/fetchClanChannelSetting');
			return thunkAPI.rejectWithValue(error);
		}
	}
);

export const settingClanChannelSlice = createSlice({
	name: SETTING_CLAN_CHANNEL,
	initialState: initialSettingClanChannelState,
	reducers: {},
	extraReducers(builder) {
		builder
			.addCase(fetchChannelSettingInClan.fulfilled, (state: SettingClanChannelState, actions) => {
				const { fromCache, response } = actions.payload;

				if (!fromCache && response) {
					state.loadingStatus = 'loaded';
					switch (actions.payload.typeFetch) {
						case ETypeFetchChannelSetting.FETCH_CHANNEL:
							channelSettingAdapter.setAll(state, response.channel_setting_list || []);
							break;
						case ETypeFetchChannelSetting.MORE_CHANNEL:
							channelSettingAdapter.setMany(state, response.channel_setting_list || []);
							break;
						case ETypeFetchChannelSetting.FETCH_THREAD:
							state.threadsByChannel[actions.payload.parentId] = response.channel_setting_list || [];
							break;
						case ETypeFetchChannelSetting.SEARCH_CHANNEL:
							state.listSearchChannel = response.channel_setting_list || [];
							break;
						default:
							channelSettingAdapter.setAll(state, response.channel_setting_list || []);
					}
					state.channelCount = response.channel_count || 0;
					state.threadCount = response.thread_count || 0;
					state.cache = createCacheMetadata();
				}

				state.loadingStatus = 'loaded';
			})
			.addCase(fetchChannelSettingInClan.pending, (state: SettingClanChannelState) => {
				state.loadingStatus = 'loading';
			})
			.addCase(fetchChannelSettingInClan.rejected, (state: SettingClanChannelState, action) => {
				state.loadingStatus = 'error';
				state.error = action.error.message;
			});
	}
});

export const channelSettingActions = {
	...settingClanChannelSlice.actions,
	fetchChannelSettingInClan
};

export const getChannelSettingState = (rootState: { [SETTING_CLAN_CHANNEL]: SettingClanChannelState }): SettingClanChannelState =>
	rootState[SETTING_CLAN_CHANNEL];
const { selectAll, selectEntities, selectById } = channelSettingAdapter.getSelectors();
export const selectAllChannelSuggestion = createSelector(getChannelSettingState, selectAll);
export const selectChannelSuggestionEntities = createSelector(getChannelSettingState, selectEntities);
export const selectOneChannelInfor = (channelId: string) => createSelector(getChannelSettingState, (state) => selectById(state, channelId));
export const selectThreadsListByParentId = (parentId: string) => createSelector(getChannelSettingState, (state) => state.threadsByChannel[parentId]);
export const settingChannelReducer = settingClanChannelSlice.reducer;
export const selectNumberChannelCount = createSelector(getChannelSettingState, (state) => state.channelCount);
export const selectNumberThreadCount = createSelector(getChannelSettingState, (state) => state.threadCount);

export const selectListChannelBySearch = createSelector(getChannelSettingState, (state) => state.listSearchChannel);
