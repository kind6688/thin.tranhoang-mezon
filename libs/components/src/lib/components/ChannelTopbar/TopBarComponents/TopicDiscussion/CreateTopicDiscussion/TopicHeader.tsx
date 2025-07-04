import { useMessageValue } from '@mezon/core';
import { selectComposeInputByChannelId, selectCurrentChannelId, topicsActions, useAppDispatch, useAppSelector } from '@mezon/store';
import { Icons } from '@mezon/ui';
import { ApiChannelDescription } from 'mezon-js/api.gen';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

type TopicHeaderProps = {
	topicCurrentChannel?: ApiChannelDescription | null;
};

const TopicHeader = ({ topicCurrentChannel }: TopicHeaderProps) => {
	const dispatch = useAppDispatch();
	const currentChannelId = useSelector(selectCurrentChannelId);

	const setIsShowCreateTopic = useCallback(
		(isShowCreateTopic: boolean, channelId?: string) => {
			dispatch(topicsActions.setIsShowCreateTopic(isShowCreateTopic));
		},
		[currentChannelId, dispatch]
	);

	const setTurnOffThreadMessage = useCallback(() => {
		dispatch(topicsActions.setOpenTopicMessageState(false));
		dispatch(topicsActions.setCurrentTopicInitMessage(null));
	}, [dispatch]);

	const { setRequestInput } = useMessageValue();

	const request = useAppSelector((state) => selectComposeInputByChannelId(state, currentChannelId as string));

	const handleCloseModal = useCallback(
		(event?: React.MouseEvent) => {
			event?.stopPropagation();
			setTurnOffThreadMessage();
			setIsShowCreateTopic(false);
			dispatch(topicsActions.setCurrentTopicId(''));
			setRequestInput({ ...request, valueTextInput: '' }, true);
		},
		[dispatch]
	);

	return (
		<div className="flex flex-row items-center justify-between px-4 h-[48px] min-h-[50px] border-b-[1px]  z-10 bg-theme-chat">
			<div className="flex flex-row items-center gap-2 pointer-events-none">
				<Icons.TopicIcon className=' text-theme-primary' />
				<span className="text-base font-semibold text-theme-primary">{'Topic'}</span>
			</div>
			<button onClick={(e) => handleCloseModal(e)} className="relative right-0">
				<Icons.Close />
			</button>
		</div>
	);
};

export default TopicHeader;
