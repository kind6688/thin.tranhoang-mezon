import { captureSentryError } from '@mezon/logger';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { HandleParticipantMeetStateEvent } from 'mezon-js';
import { ensureSession, ensureSocket, getMezonCtx, MezonValueContext } from '../helpers';

type generateMeetTokenPayload = {
	channelId: string;
	roomName: string;
};

const generateMeetTokenCached = async (mezon: MezonValueContext, channelId: string, roomName: string) => {
	const body = {
		channel_id: channelId,
		room_name: roomName
	};
	return await mezon.client.generateMeetToken(mezon.session, body);
};

export const generateMeetToken = createAsyncThunk('meet/generateMeetToken', async ({ channelId, roomName }: generateMeetTokenPayload, thunkAPI) => {
	try {
		const mezon = await ensureSession(getMezonCtx(thunkAPI));

		const response = await generateMeetTokenCached(mezon, channelId, roomName);
		if (!response) {
			return;
		}
		return response.token;
	} catch (error) {
		captureSentryError(error, 'meet/generateMeetToken');
		return thunkAPI.rejectWithValue(error);
	}
});

export const handleParticipantMeetState = createAsyncThunk(
	'meet/handleParticipantMeetState',
	async ({ clan_id, channel_id, user_id, display_name, state }: any, thunkAPI) => {
		//TODO remove this function after mobile team update their code
		return;
	}
);

export const handleParticipantVoiceState = createAsyncThunk(
	'meet/handleParticipantVoiceState',
	async ({ clan_id, channel_id, display_name, state }: HandleParticipantMeetStateEvent, thunkAPI) => {
		try {
			const mezon = await ensureSocket(getMezonCtx(thunkAPI));
			const response = await mezon.socketRef.current?.handleParticipantMeetState(clan_id, channel_id, display_name, state);
			return response;
		} catch (error) {
			captureSentryError(error, 'meet/handleParticipantMeetState');
			return thunkAPI.rejectWithValue(error);
		}
	}
);
