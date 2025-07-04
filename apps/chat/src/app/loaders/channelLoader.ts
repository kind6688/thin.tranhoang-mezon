import { channelsActions, threadsActions, topicsActions } from '@mezon/store';
import { notificationService } from '@mezon/utils';
import { ShouldRevalidateFunction } from 'react-router-dom';
import { CustomLoaderFunction } from './appLoader';
import { waitForSocketConnection } from './socketUtils';

export const channelLoader: CustomLoaderFunction = async ({ params, request, dispatch }) => {
	const { channelId, clanId } = params;
	const messageId = new URL(request.url).searchParams.get('messageId');
	if (!channelId || !clanId) {
		throw new Error('Channel ID null');
	}

	await dispatch(waitForSocketConnection());

	dispatch(channelsActions.addThreadToChannels({ channelId, clanId }));
	dispatch(channelsActions.joinChannel({ clanId, channelId, noFetchMembers: false, messageId: messageId || '' }));
	dispatch(channelsActions.setPreviousChannels({ clanId, channelId }));
	notificationService.setCurrentChannelId(channelId);
	dispatch(topicsActions.setIsShowCreateTopic(false));
	dispatch(topicsActions.setCurrentTopicId(''));
	dispatch(topicsActions.setFocusTopicBox(false));
	dispatch(threadsActions.setFocusThreadBox(false));
	dispatch(threadsActions.hideThreadModal());
	return null;
};

export const shouldRevalidateChannel: ShouldRevalidateFunction = (ctx) => {
	const { currentParams, nextParams } = ctx;
	const { channelId: currentChannelId } = currentParams;
	const { channelId: nextChannelId } = nextParams;
	return currentChannelId !== nextChannelId;
};
