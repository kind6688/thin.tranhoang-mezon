import { captureSentryError } from '@mezon/logger';
import { IEmojiRecent, RECENT_EMOJI_CATEGORY } from '@mezon/utils';
import { EntityState, PayloadAction, createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { ApiClanEmoji } from 'mezon-js/dist/api.gen';
import { CacheMetadata, createApiKey, createCacheMetadata, markApiFirstCalled, shouldForceApiCall } from '../cache-metadata';
import { MezonValueContext, ensureSession, getMezonCtx } from '../helpers';
import { stickerSettingActions } from '../settingSticker/settingSticker.slice';
import { RootState } from '../store';
import { emojiSuggestionActions, selectAllEmojiSuggestion } from './emojiSuggestion.slice';

export const EMOJI_RECENT_FEATURE_KEY = 'emojiRecent';

export interface EmojiRecentEntity extends IEmojiRecent {
	id: string;
}

export interface EmojiRecentState extends EntityState<EmojiRecentEntity, string> {
	loadingStatus: 'not loaded' | 'loading' | 'loaded' | 'error';
	lastEmojiRecent: { emoji_recents_id: string; emoji_id?: string };
	cache?: CacheMetadata;
}

export const emojiRecentAdapter = createEntityAdapter({
	selectId: (emo: EmojiRecentEntity) => emo.emoji_id || ''
});

const { selectAll: selectAllEmojiRecentEntities } = emojiRecentAdapter.getSelectors();

const selectCachedEmojiRecent = createSelector([(state: RootState) => state[EMOJI_RECENT_FEATURE_KEY]], (entitiesState) => {
	return entitiesState ? selectAllEmojiRecentEntities(entitiesState) : [];
});

export const fetchEmojiRecentCached = async (getState: () => RootState, ensuredMezon: MezonValueContext, noCache = false) => {
	const state = getState();
	const emojiData = state[EMOJI_RECENT_FEATURE_KEY];
	const apiKey = createApiKey('fetchEmojiRecent');
	const shouldForceCall = shouldForceApiCall(apiKey, emojiData?.cache, noCache);

	if (!shouldForceCall) {
		const emojis = selectCachedEmojiRecent(state);
		return {
			emoji_recents: emojis,
			time: Date.now(),
			fromCache: true
		};
	}
	const response = await ensuredMezon.client.emojiRecentList(ensuredMezon.session);

	markApiFirstCalled(apiKey);

	return {
		...response,
		time: Date.now(),
		fromCache: false
	};
};

export const fetchEmojiRecent = createAsyncThunk('emoji/fetchEmojiRecent', async ({ noCache = false }: { noCache?: boolean }, thunkAPI) => {
	try {
		const mezon = await ensureSession(getMezonCtx(thunkAPI));
		const response = await fetchEmojiRecentCached(thunkAPI.getState as () => RootState, mezon, noCache);

		if (!response?.emoji_recents) {
			thunkAPI.dispatch(emojiRecentActions.setLastEmojiRecent({ emoji_recents_id: '0', emoji_id: '' }));
			return {
				emojis: [],
				fromCache: response?.fromCache
			};
		}
		thunkAPI.dispatch(
			emojiRecentActions.setLastEmojiRecent({
				emoji_recents_id: response.emoji_recents[0].emoji_recents_id,
				emoji_id: response.emoji_recents[0].emoji_id
			})
		);
		return {
			emojis: response.emoji_recents,
			fromCache: response?.fromCache
		};
	} catch (error) {
		captureSentryError(error, 'emoji/fetchEmojiRecent');
		return thunkAPI.rejectWithValue(error);
	}
});

const buyItemForSale = createAsyncThunk('emoji/buyItemForSale', async ({ id, type }: { id?: string; type?: number }, thunkAPI) => {
	try {
		const mezon = await ensureSession(getMezonCtx(thunkAPI));
		const response = await mezon.client.unlockItem(mezon.session, {
			item_id: id,
			item_type: type
		});
		if (response && response.source && id) {
			if (type) {
				thunkAPI.dispatch(
					stickerSettingActions.update({
						id: id,
						changes: {
							source: response.source
						}
					})
				);
			} else {
				thunkAPI.dispatch(
					emojiSuggestionActions.update({
						id: id,
						changes: {
							src: response.source
						}
					})
				);
			}
		}

		return response;
	} catch (error) {
		captureSentryError(error, 'emoji/fetchEmojiRecent');
		return thunkAPI.rejectWithValue(error);
	}
});
export const initialEmojiRecentState: EmojiRecentState = emojiRecentAdapter.getInitialState({
	loadingStatus: 'not loaded',
	lastEmojiRecent: { emoji_recents_id: '0' }
});

export const emojiRecentSlice = createSlice({
	name: EMOJI_RECENT_FEATURE_KEY,
	initialState: initialEmojiRecentState,
	reducers: {
		setLastEmojiRecent: (state, action: PayloadAction<any>) => {
			state.lastEmojiRecent = action.payload;
		},
		addFirstEmojiRecent: (state, action: PayloadAction<any>) => {
			const emoji = action.payload;

			const existingIndex = state.ids.indexOf(emoji.emoji_id);
			if (existingIndex !== -1) {
				state.ids.splice(existingIndex, 1);
			}

			state.ids.unshift(emoji.emoji_id);
			state.entities[emoji.emoji_id] = emoji;

			if (state.ids.length > 20) {
				const removedId = state.ids.pop();
				delete state.entities[removedId!];
			}
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchEmojiRecent.pending, (state: EmojiRecentState) => {
				state.loadingStatus = 'loading';
			})
			.addCase(fetchEmojiRecent.fulfilled, (state, action: PayloadAction<any>) => {
				if (!action?.payload?.fromCache) state.cache = createCacheMetadata();
				if (action?.payload?.emojis) emojiRecentAdapter.setAll(state, action.payload.emojis);

				state.loadingStatus = 'loaded';
			})
			.addCase(fetchEmojiRecent.rejected, (state: EmojiRecentState, action) => {
				state.loadingStatus = 'error';
			})
			.addCase(buyItemForSale.pending, (state: EmojiRecentState) => {
				state.loadingStatus = 'loading';
			});
	}
});

export const emojiRecentReducer = emojiRecentSlice.reducer;

export const emojiRecentActions = {
	...emojiRecentSlice.actions,
	fetchEmojiRecent,
	buyItemForSale
};

export const getEmojiRecentState = (rootState: { [EMOJI_RECENT_FEATURE_KEY]: EmojiRecentState }): EmojiRecentState =>
	rootState[EMOJI_RECENT_FEATURE_KEY];

export const selectLastEmojiRecent = createSelector(getEmojiRecentState, (emojisState) => emojisState.lastEmojiRecent);

export const selectAllEmojiRecent = createSelector([selectAllEmojiSuggestion, getEmojiRecentState], (allEmojiSuggestion, allEmojiRecentId) => {
	if (allEmojiSuggestion?.length === 0 || allEmojiRecentId?.ids?.length === 0) return [];

	const emojiRecents = allEmojiRecentId?.ids
		?.map((id) => {
			const emoji = allEmojiSuggestion.find((emoji) => emoji.id === id);
			const recentEmoji = allEmojiRecentId.entities[id];

			if (!emoji || !recentEmoji) return null;

			return {
				id: emoji.id ?? '',
				shortname: emoji.shortname ?? '',
				src: emoji.src ?? '',
				category: RECENT_EMOJI_CATEGORY,
				emoji_recents_id: recentEmoji?.emoji_recents_id ?? ''
			} as ApiClanEmoji;
		})
		.filter((emoji): emoji is ApiClanEmoji => emoji !== null);

	return emojiRecents;
});
