import { captureSentryError } from '@mezon/logger';
import { ETypeLinkMedia, IAttachmentEntity, IChannelAttachment, LoadingStatus } from '@mezon/utils';
import { EntityState, PayloadAction, createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { ChannelStreamMode } from 'mezon-js';
import { ApiChannelAttachment } from 'mezon-js/dist/api.gen';
import { CacheMetadata, createApiKey, createCacheMetadata, markApiFirstCalled, shouldForceApiCall } from '../cache-metadata';
import { MezonValueContext, ensureSession, getMezonCtx } from '../helpers';

export const ATTACHMENT_FEATURE_KEY = 'attachments';

/*
 * Update these interfaces according to your requirements.
 */
export interface AttachmentEntity extends IChannelAttachment {
	id: string; // Primary ID
}

export interface AttachmentState extends EntityState<AttachmentEntity, string> {
	loadingStatus: LoadingStatus;
	error?: string | null;
	attachment: string;
	openModalAttachment: boolean;
	mode: ChannelStreamMode | undefined;
	messageId: string;
	currentAttachment: AttachmentEntity | null;
	listAttachmentsByChannel: Record<
		string,
		{
			attachments: AttachmentEntity[];
			cache?: CacheMetadata;
		}
	>;
}

export const attachmentAdapter = createEntityAdapter({
	selectId: (attachment: AttachmentEntity) => attachment.url as string,
	sortComparer: (a: AttachmentEntity, b: AttachmentEntity) => {
		if (a.create_time && b.create_time) {
			return Date.parse(b.create_time) - Date.parse(a.create_time);
		}
		return 0;
	}
});

type fetchChannelAttachmentsPayload = {
	clanId: string;
	channelId: string;
	noCache?: boolean;
};

const CHANNEL_ATTACHMENTS_CACHED_TIME = 1000 * 60 * 60;

export const fetchChannelAttachmentsCached = async (
	getState: () => any,
	mezon: MezonValueContext,
	clanId: string,
	channelId: string,
	noCache = false
) => {
	const currentState = getState();
	const attachmentState = currentState[ATTACHMENT_FEATURE_KEY] as AttachmentState;
	const channelData = attachmentState.listAttachmentsByChannel[channelId];
	const apiKey = createApiKey('fetchChannelAttachments', clanId, channelId);

	const shouldForceCall = shouldForceApiCall(apiKey, channelData?.cache, noCache);

	if (!shouldForceCall) {
		return {
			attachments: channelData.attachments,
			fromCache: true,
			time: channelData.cache?.lastFetched || Date.now()
		};
	}

	const response = await mezon.client.listChannelAttachments(mezon.session, clanId, channelId, '');

	markApiFirstCalled(apiKey);

	return {
		...response,
		fromCache: false,
		time: Date.now()
	};
};

export const mapChannelAttachmentsToEntity = (attachmentRes: ApiChannelAttachment, channelId?: string, clanId?: string) => {
	const attachmentEntity: IAttachmentEntity = { ...attachmentRes, id: attachmentRes.id || '', channelId, clanId };
	return attachmentEntity;
};

export const fetchChannelAttachments = createAsyncThunk(
	'attachment/fetchChannelAttachments',
	async ({ clanId, channelId, noCache }: fetchChannelAttachmentsPayload, thunkAPI) => {
		try {
			const mezon = await ensureSession(getMezonCtx(thunkAPI));

			const response = await fetchChannelAttachmentsCached(thunkAPI.getState, mezon, channelId, clanId, Boolean(noCache));

			if (!response.attachments) {
				return { attachments: [], channelId, fromCache: response.fromCache };
			}

			const attachments = response.attachments.map((attachmentRes) => mapChannelAttachmentsToEntity(attachmentRes, channelId, clanId));

			if (response.fromCache) {
				return {
					attachments: [],
					channelId,
					fromCache: true
				};
			}

			return { attachments, channelId, fromCache: response.fromCache };
		} catch (error) {
			captureSentryError(error, 'attachment/fetchChannelAttachments');
			return thunkAPI.rejectWithValue(error);
		}
	}
);

const getInitialChannelState = () => ({
	attachments: [] as AttachmentEntity[]
});

export const initialAttachmentState: AttachmentState = attachmentAdapter.getInitialState({
	loadingStatus: 'not loaded',
	error: null,
	attachment: '',
	openModalAttachment: false,
	mode: undefined,
	messageId: '',
	currentAttachment: null,
	listAttachmentsByChannel: {}
});

export const attachmentSlice = createSlice({
	name: ATTACHMENT_FEATURE_KEY,
	initialState: initialAttachmentState,
	reducers: {
		add: attachmentAdapter.addOne,
		addMany: attachmentAdapter.addMany,
		remove: attachmentAdapter.removeOne,
		setAttachment: (state, action) => {
			state.attachment = action.payload;
		},
		setOpenModalAttachment: (state, action) => {
			state.openModalAttachment = action.payload;
		},
		setMode: (state, action) => {
			state.mode = action.payload;
		},
		setMessageId: (state, action) => {
			state.messageId = action.payload;
		},
		setCurrentAttachment: (state, action: PayloadAction<AttachmentEntity | null>) => {
			state.currentAttachment = action.payload;
		},
		removeCurrentAttachment: (state) => {
			state.currentAttachment = null;
		},
		updateCache: (state, action: PayloadAction<{ channelId: string }>) => {
			const { channelId } = action.payload;
			if (!state.listAttachmentsByChannel[channelId]) {
				state.listAttachmentsByChannel[channelId] = getInitialChannelState();
			}
			state.listAttachmentsByChannel[channelId].cache = createCacheMetadata(CHANNEL_ATTACHMENTS_CACHED_TIME);
		},
		addAttachments: (state, action: PayloadAction<{ listAttachments: AttachmentEntity[]; channelId: string }>) => {
			const currentChannelId = action?.payload?.channelId;

			if (!state.listAttachmentsByChannel[currentChannelId]) {
				state.listAttachmentsByChannel[currentChannelId] = getInitialChannelState();
			}

			action?.payload?.listAttachments?.forEach((attachment) => {
				state?.listAttachmentsByChannel[currentChannelId]?.attachments?.unshift(attachment);
			});
		},
		removeAttachments: (state, action: PayloadAction<{ messageId: string; channelId: string }>) => {
			const { messageId, channelId } = action.payload;
			if (state.listAttachmentsByChannel[channelId]) {
				state.listAttachmentsByChannel[channelId].attachments = state.listAttachmentsByChannel[channelId].attachments.filter(
					(attachment) => attachment.message_id !== messageId
				);

				if (state.listAttachmentsByChannel[channelId].attachments.length === 0) {
					delete state.listAttachmentsByChannel[channelId];
				}
			}
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchChannelAttachments.pending, (state: AttachmentState) => {
				state.loadingStatus = 'loading';
			})
			.addCase(
				fetchChannelAttachments.fulfilled,
				(state: AttachmentState, action: PayloadAction<{ attachments: AttachmentEntity[]; channelId: string; fromCache?: boolean }>) => {
					const { attachments, channelId, fromCache } = action.payload;

					if (!state.listAttachmentsByChannel[channelId]) {
						state.listAttachmentsByChannel[channelId] = getInitialChannelState();
					}

					if (!fromCache && attachments.length > 0) {
						attachmentAdapter.setAll(state, attachments);
						state.listAttachmentsByChannel[channelId].attachments = attachments;
						state.listAttachmentsByChannel[channelId].cache = createCacheMetadata(CHANNEL_ATTACHMENTS_CACHED_TIME);
					}

					state.loadingStatus = 'loaded';
				}
			)
			.addCase(fetchChannelAttachments.rejected, (state: AttachmentState, action) => {
				state.loadingStatus = 'error';
				state.error = action.error.message;
			});
	}
});

/*
 * Export reducer for store configuration.
 */
export const attachmentReducer = attachmentSlice.reducer;

/*
 * Export action creators to be dispatched. For use with the `useDispatch` hook.
 *
 * e.g.
 * ```
 * import React, { useEffect } from 'react';
 * import { useDispatch } from 'react-redux';
 *
 * // ...
 *
 * const dispatch = useDispatch();
 * useEffect(() => {
 *   dispatch(usersActions.add({ id: 1 }))
 * }, [dispatch]);
 * ```
 *
 * See: https://react-redux.js.org/next/api/hooks#usedispatch
 */
export const attachmentActions = {
	...attachmentSlice.actions,
	fetchChannelAttachments
};

/*
 * Export selectors to query state. For use with the `useSelector` hook.
 *
 * e.g.
 * ```
 * import { useSelector } from 'react-redux';
 *
 * // ...
 *
 * const entities = useSelector(selectAllUsers);
 * ```
 *
 * See: https://react-redux.js.org/next/api/hooks#useselector
 */
const { selectAll, selectEntities } = attachmentAdapter.getSelectors();

export const getAttachmentState = (rootState: { [ATTACHMENT_FEATURE_KEY]: AttachmentState }): AttachmentState => rootState[ATTACHMENT_FEATURE_KEY];

export const selectAllAttachment = createSelector(getAttachmentState, selectAll);

export const selectAttachmentEntities = createSelector(getAttachmentState, selectEntities);

export const selectAttachment = createSelector(getAttachmentState, (state: AttachmentState) => state.attachment);

export const selectCurrentAttachmentShowImage = createSelector(getAttachmentState, (state: AttachmentState) => state.currentAttachment);

export const selectOpenModalAttachment = createSelector(getAttachmentState, (state: AttachmentState) => state.openModalAttachment);

export const selectModeAttachment = createSelector(getAttachmentState, (state: AttachmentState) => state.mode);

export const selectMessageIdAttachment = createSelector(getAttachmentState, (state: AttachmentState) => state.messageId);

export const selectAttachmentPhoto = () =>
	createSelector(selectAllAttachment, (attachments) => (attachments || []).filter((att) => att?.filetype?.startsWith(ETypeLinkMedia.IMAGE_PREFIX)));

export const selectAllListAttachmentByChannel = createSelector([getAttachmentState, (state, channelId: string) => channelId], (state, channelId) => {
	if (!Object.prototype.hasOwnProperty.call(state.listAttachmentsByChannel, channelId)) {
		return undefined;
	}
	return state.listAttachmentsByChannel[channelId]?.attachments?.filter((att) => att?.filetype?.startsWith(ETypeLinkMedia.IMAGE_PREFIX));
});

export const selectAllListDocumentByChannel = createSelector([getAttachmentState, (state, channelId: string) => channelId], (state, channelId) => {
	if (!Object.prototype.hasOwnProperty.call(state.listAttachmentsByChannel, channelId)) {
		return [];
	}

	return (
		state.listAttachmentsByChannel[channelId]?.attachments?.reduce<AttachmentEntity[]>((result, att) => {
			const { filetype, filename } = att || {};
			if (!filetype?.startsWith(ETypeLinkMedia.IMAGE_PREFIX) && !filetype?.startsWith(ETypeLinkMedia.VIDEO_PREFIX)) {
				result.push({
					...att,
					filename: filename ?? 'File',
					filetype: filetype ?? 'File'
				});
			}
			return result;
		}, []) || []
	);
});
