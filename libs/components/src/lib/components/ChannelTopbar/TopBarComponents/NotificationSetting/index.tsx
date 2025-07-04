import { useEscapeKeyClose, useOnClickOutside } from '@mezon/core';
import {
	notifiReactMessageActions,
	notificationSettingActions,
	selectCurrentChannel,
	selectCurrentChannelId,
	selectCurrentClanId,
	selectDefaultNotificationCategory,
	selectDefaultNotificationClan,
	selectNotifiReactMessage,
	selectNotifiSettingsEntitiesById,
	useAppDispatch,
	useAppSelector
} from '@mezon/store';
import { ENotificationTypes, FOR_15_MINUTES, FOR_1_HOUR, FOR_24_HOURS, FOR_3_HOURS, FOR_8_HOURS } from '@mezon/utils';
import { format } from 'date-fns';
import { Dropdown } from 'flowbite-react';
import { RefObject, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { notificationTypesList } from '../../../PanelChannel';
import ItemPanel from '../../../PanelChannel/ItemPanel';

const NotificationSetting = ({ onClose, rootRef }: { onClose: () => void; rootRef?: RefObject<HTMLElement> }) => {
	const currentChannel = useSelector(selectCurrentChannel);
	const getNotificationChannelSelected = useAppSelector((state) => selectNotifiSettingsEntitiesById(state, currentChannel?.id || ''));
	const dispatch = useAppDispatch();
	const currentChannelId = useSelector(selectCurrentChannelId);
	const currentClanId = useSelector(selectCurrentClanId);
	const [nameChildren, setNameChildren] = useState('');
	const [mutedUntil, setmutedUntil] = useState('');
	const defaultNotificationCategory = useAppSelector((state) => selectDefaultNotificationCategory(state, currentChannel?.category_id as string));

	const defaultNotificationClan = useSelector(selectDefaultNotificationClan);
	const notifiReactMessage = useSelector(selectNotifiReactMessage);
	const [isNotifyReactMessage, setisNotifyReactMessage] = useState(notifiReactMessage?.id !== '0');

	useEffect(() => {
		if (getNotificationChannelSelected?.active === 1 || getNotificationChannelSelected?.id === '0') {
			setNameChildren('Mute Channel');
			setmutedUntil('');
		} else {
			setNameChildren('Unmute Channel');
			if (getNotificationChannelSelected?.time_mute) {
				const timeMute = new Date(getNotificationChannelSelected.time_mute);
				const currentTime = new Date();
				if (timeMute > currentTime) {
					const timeDifference = timeMute.getTime() - currentTime.getTime();
					const formattedDate = format(timeMute, 'dd/MM, HH:mm');
					setmutedUntil(`Muted until ${formattedDate}`);

					setTimeout(() => {
						const body = {
							channel_id: currentChannelId || '',
							notification_type: getNotificationChannelSelected?.notification_setting_type || 0,
							clan_id: currentClanId || '',
							active: 1
						};
						dispatch(notificationSettingActions.setMuteNotificationSetting(body));
					}, timeDifference);
				}
			}
		}
	}, [getNotificationChannelSelected, defaultNotificationCategory, defaultNotificationClan]);

	const handleScheduleMute = (duration: number) => {
		if (duration !== Infinity) {
			const now = new Date();
			const unmuteTime = new Date(now.getTime() + duration);
			const unmuteTimeISO = unmuteTime.toISOString();

			const body = {
				channel_id: currentChannelId || '',
				notification_type: getNotificationChannelSelected?.notification_setting_type || 0,
				clan_id: currentClanId || '',
				time_mute: unmuteTimeISO
			};
			dispatch(notificationSettingActions.setNotificationSetting(body));
		} else {
			const body = {
				channel_id: currentChannelId || '',
				notification_type: getNotificationChannelSelected?.notification_setting_type || 0,
				clan_id: currentClanId || '',
				active: 0
			};
			dispatch(notificationSettingActions.setMuteNotificationSetting(body));
		}
	};

	const muteOrUnMuteChannel = (active: number) => {
		const body = {
			channel_id: currentChannelId || '',
			notification_type: getNotificationChannelSelected?.notification_setting_type || 0,
			clan_id: currentClanId || '',
			active: active
		};
		dispatch(notificationSettingActions.setMuteNotificationSetting(body));
	};

	const setNotification = (notificationType: number) => {
		if (notificationType) {
			const body = {
				channel_id: currentChannelId || '',
				notification_type: notificationType || 0,
				clan_id: currentClanId || ''
			};
			dispatch(notificationSettingActions.setNotificationSetting(body));
		} else {
			dispatch(notificationSettingActions.deleteNotiChannelSetting({ channel_id: currentChannelId || '', clan_id: currentClanId || '' }));
		}
	};

	const setNotiReactMess = () => {
		if (!isNotifyReactMessage) {
			dispatch(notifiReactMessageActions.setNotifiReactMessage({ channel_id: currentChannelId || '' }));
		} else {
			dispatch(notifiReactMessageActions.deleteNotifiReactMessage({ channel_id: currentChannelId || '' }));
		}
		setisNotifyReactMessage(!isNotifyReactMessage);
	};
	const modalRef = useRef<HTMLDivElement>(null);
	useEscapeKeyClose(modalRef, onClose);
	useOnClickOutside(modalRef, onClose, rootRef);

	return (
		<div ref={modalRef} tabIndex={-1} className="absolute top-8 right-0 shadow z-[99999999]">
			<div className="flex flex-col rounded-[4px] w-[202px] shadow-sm overflow-hidden py-[6px] px-[8px]">
				<div className="flex flex-col pb-1 mb-1 border-b-theme-primary last:border-b-0 last:mb-0 last:pb-0 ">
					{getNotificationChannelSelected?.active === 1 || getNotificationChannelSelected?.id === '0' ? (
						<Dropdown
							trigger="hover"
							dismissOnClick={false}
							renderTrigger={() => (
								<div>
									<ItemPanel
										children={nameChildren}
										subText={mutedUntil}
										dropdown="change here"
										onClick={() => muteOrUnMuteChannel(0)}
									/>
								</div>
							)}
							label=""
							placement="right-start"
							className="bg-theme-contexify text-theme-primary border-none ml-[3px] py-[6px] px-[8px] w-[200px] "
						>
							<ItemPanel children="For 15 Minutes" onClick={() => handleScheduleMute(FOR_15_MINUTES)} />
							<ItemPanel children="For 1 Hour" onClick={() => handleScheduleMute(FOR_1_HOUR)} />
							<ItemPanel children="For 3 Hours" onClick={() => handleScheduleMute(FOR_3_HOURS)} />
							<ItemPanel children="For 8 Hours" onClick={() => handleScheduleMute(FOR_8_HOURS)} />
							<ItemPanel children="For 24 Hours" onClick={() => handleScheduleMute(FOR_24_HOURS)} />
							<ItemPanel children="Until I turn it back on" onClick={() => handleScheduleMute(Infinity)} />
						</Dropdown>
					) : (
						<ItemPanel children={nameChildren} subText={mutedUntil} onClick={() => muteOrUnMuteChannel(1)} />
					)}
				</div>
				{/* <div className="flex flex-col pb-2 mb-1 border-b-[0.08px] dark:border-b-[#6A6A6A] border-b-[#E1E1E1] last:border-b-0 last:mb-0 last:pb-0">
					<ItemPanel
						children="Reaction Message"
						type="checkbox"
						name="NotifiReactionSetting"
						checked={isNotifyReactMessage}
						onClick={setNotiReactMess}
					/>
				</div> */}
				<ItemPanel
					children="Use Category Default"
					type="radio"
					name="NotificationSetting"
					defaultNotifi={true}
					checked={
						getNotificationChannelSelected?.notification_setting_type === ENotificationTypes.DEFAULT ||
						getNotificationChannelSelected?.notification_setting_type === undefined
					}
					onClick={() => setNotification(ENotificationTypes.DEFAULT)}
				/>
				{notificationTypesList.map((notification) => (
					<ItemPanel
						children={notification.label}
						notificationId={notification.value}
						type="radio"
						name="NotificationSetting"
						key={notification.value}
						checked={getNotificationChannelSelected?.notification_setting_type === notification.value}
						onClick={() => setNotification(notification.value)}
					/>
				))}
			</div>
		</div>
	);
};

export default NotificationSetting;
