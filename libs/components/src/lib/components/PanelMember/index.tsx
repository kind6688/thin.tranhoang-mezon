import {
	useAppNavigation,
	useAppParams,
	useAuth,
	useChannelMembersActions,
	useDirect,
	useEscapeKeyClose,
	useFriends,
	useMarkAsRead,
	useMessageValue,
	useOnClickOutside,
	usePermissionChecker,
	useSettingFooter
} from '@mezon/core';
import {
	EStateFriend,
	IUpdateChannelRequest,
	SetMuteNotificationPayload,
	SetNotificationPayload,
	channelUsersActions,
	channelsActions,
	directMetaActions,
	e2eeActions,
	notificationSettingActions,
	removeChannelUsersPayload,
	selectComposeInputByChannelId,
	selectCurrentChannel,
	selectCurrentClan,
	selectDmGroupCurrent,
	selectFriendStatus,
	selectHasKeyE2ee,
	selectNotifiSettingsEntitiesById,
	useAppDispatch,
	useAppSelector
} from '@mezon/store';
import { ChannelMembersEntity, EPermission, EUserSettings } from '@mezon/utils';
import { format } from 'date-fns';
import { ChannelType } from 'mezon-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MentionItem } from 'react-mentions';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Coords } from '../ChannelLink';
import { directMessageValueProps } from '../DmList/DMListItem';
import { DataMemberCreate } from '../DmList/MemberListGroupChat';
import { EActiveType } from '../SettingProfile/SettingRightProfile';
import GroupPanelMember from './GroupPanelMember';
import ItemPanelMember from './ItemPanelMember';
import PanelGroupDM from './PanelGroupDm';

type PanelMemberProps = {
	coords: Coords;
	member?: ChannelMembersEntity;
	onClose: () => void;
	onRemoveMember?: () => void;
	directMessageValue?: directMessageValueProps;
	name?: string;
	isMemberDMGroup?: boolean;
	isMemberChannel?: boolean;
	dataMemberCreate?: DataMemberCreate;
	onOpenProfile?: () => void;
};

const useClanOwnerChecker = (userId: string) => {
	const currentClan = useSelector(selectCurrentClan);
	const isClanOwner = useMemo(() => {
		return currentClan?.creator_id === userId;
	}, [currentClan, userId]);
	return isClanOwner;
};

const PanelMember = ({
	coords,
	member,
	directMessageValue,
	name,
	onClose,
	onRemoveMember,
	isMemberDMGroup,
	dataMemberCreate,
	onOpenProfile
}: PanelMemberProps) => {
	const dispatch = useAppDispatch();
	const { userProfile } = useAuth();
	const currentChannel = useSelector(selectCurrentChannel);
	const panelRef = useRef<HTMLDivElement | null>(null);
	const currentClan = useSelector(selectCurrentClan);
	const [positionTop, setPositionTop] = useState<boolean>(false);
	const { removeMemberChannel } = useChannelMembersActions();
	const [hasClanOwnerPermission, hasAdminPermission] = usePermissionChecker([EPermission.clanOwner, EPermission.administrator]);
	const memberIsClanOwner = useClanOwnerChecker(member?.user?.id ?? '');
	const { directId } = useAppParams();
	const getNotificationChannelSelected = useAppSelector((state) => selectNotifiSettingsEntitiesById(state, directMessageValue?.dmID || ''));
	const [nameChildren, setNameChildren] = useState('');
	const [mutedUntil, setmutedUntil] = useState('');
	const hasKeyE2ee = useSelector(selectHasKeyE2ee);
	const isCreator = userProfile?.user?.id === currentChannel?.creator_id;
	const request = useAppSelector((state) => selectComposeInputByChannelId(state, currentChannel?.channel_id as string));

	useEffect(() => {
		const heightPanel = panelRef.current?.clientHeight;
		if (heightPanel && heightPanel > coords.distanceToBottom) {
			setPositionTop(true);
		}
	}, [coords.distanceToBottom]);

	const handleRemoveMember = () => {
		onRemoveMember?.();
	};

	const handleRemoveMemberChannel = async () => {
		if (member) {
			const userIds = [member?.user?.id ?? ''];
			await removeMemberChannel({ channelId: directId || '', userIds });
		}
	};
	const friendInfor = useMemo(() => {
		return {
			id: directMessageValue ? directMessageValue?.userId[0] || '' : member?.user?.id || '',
			name: directMessageValue ? name || '' : member?.user?.username || ''
		};
	}, [directMessageValue]);

	const hasAddFriend = useSelector(
		selectFriendStatus(
			directMessageValue && directMessageValue.type !== ChannelType.CHANNEL_TYPE_GROUP ? directMessageValue.userId[0] : member?.user?.id || ''
		)
	);
	const isSelf = useMemo(() => userProfile?.user?.id === member?.user?.id, [member?.user?.id, userProfile?.user?.id]);
	const checkDm = useMemo(() => directMessageValue?.type === ChannelType.CHANNEL_TYPE_DM, [directMessageValue?.type]);
	const checkDmGroup = useMemo(() => directMessageValue?.type === ChannelType.CHANNEL_TYPE_GROUP, [directMessageValue?.type]);
	const { deleteFriend, addFriend } = useFriends();
	const [isDmGroupOwner, setIsDmGroupOwner] = useState(false);
	const { toDmGroupPageFromMainApp } = useAppNavigation();
	const navigate = useNavigate();
	const { createDirectMessageWithUser } = useDirect();
	const { setRequestInput } = useMessageValue();

	const displayMentionName = useMemo(() => {
		if (member?.clan_nick) return member.clan_nick;
		return member?.user?.display_name ?? member?.user?.username;
	}, [member]);
	const currentDmGroup = useSelector(selectDmGroupCurrent(directMessageValue?.dmID ?? ''));
	const { setIsShowSettingFooterStatus, setIsShowSettingFooterInitTab, setIsUserProfile, setIsShowSettingProfileInitTab, setClanIdSettingProfile } =
		useSettingFooter();

	const handleOpenProfile = () => {
		if (onOpenProfile) {
			onOpenProfile();
		}
		onClose();
	};

	const handleDirectMessageWithUser = async () => {
		const response = await createDirectMessageWithUser(
			member?.user?.id || '',
			member?.user?.display_name,
			member?.user?.username,
			member?.user?.avatar_url
		);
		if (response?.channel_id) {
			const directDM = toDmGroupPageFromMainApp(response.channel_id, Number(response.type));
			navigate(directDM);
		}
	};

	const handleClickMention = () => {
		const mentionInInput = `@[${displayMentionName}](${member?.user?.id})`;
		const mentionPlainTextIndex = request?.content?.length ?? 0;
		const mentionInputValueIndex = request?.valueTextInput?.length ?? 0;

		const mentionItem: MentionItem = {
			display: `@${displayMentionName}`,
			id: member?.user?.id as string,
			childIndex: 0,
			index: mentionInputValueIndex,
			plainTextIndex: mentionPlainTextIndex
		};

		if (request?.valueTextInput) {
			setRequestInput({
				...request,
				valueTextInput: request?.valueTextInput + mentionInInput + ' ',
				content: request?.content + `@${displayMentionName} `,
				mentionRaw: [...request.mentionRaw, mentionItem]
			});
		} else {
			setRequestInput({
				...request,
				valueTextInput: mentionInInput + ' ',
				content: `@${displayMentionName} `,
				mentionRaw: [mentionItem]
			});
		}
	};

	useEffect(() => {
		if (userProfile?.user?.id === currentDmGroup?.creator_id) {
			setIsDmGroupOwner(true);
		}
	}, [currentDmGroup, userProfile]);

	const handleOpenClanProfileSetting = () => {
		setIsUserProfile(false);
		setIsShowSettingFooterInitTab(EUserSettings.PROFILES);
		setIsShowSettingProfileInitTab(EActiveType.CLAN_SETTING);
		setClanIdSettingProfile(currentClan?.clan_id || '');
		setIsShowSettingFooterStatus(true);
		if (onClose) {
			onClose();
		}
	};

	useEscapeKeyClose(panelRef, onClose);
	useOnClickOutside(panelRef, onClose);
	const { handleMarkAsReadDM } = useMarkAsRead();
	const handleMarkAsRead = useCallback(
		(directId: string) => {
			const timestamp = Date.now() / 1000;
			dispatch(directMetaActions.setDirectLastSeenTimestamp({ channelId: directId, timestamp: timestamp }));
			handleMarkAsReadDM(directId);
		},
		[dispatch]
	);

	const handleEnableE2ee = useCallback(async (directId?: string, e2ee?: number) => {
		if (!hasKeyE2ee && !e2ee) {
			dispatch(e2eeActions.setDirectMesIdE2ee(directId));
			dispatch(e2eeActions.setOpenModalE2ee(true));
			return;
		}
		if (!directId) return;
		const updateChannel: IUpdateChannelRequest = {
			channel_id: directId,
			channel_label: '',
			category_id: currentDmGroup.category_id,
			app_id: currentDmGroup.app_id || '',
			e2ee: !currentDmGroup.e2ee ? 1 : 0
		};
		await dispatch(channelsActions.updateChannel(updateChannel));
	}, []);

	useEffect(() => {
		if (getNotificationChannelSelected?.active === 1 || getNotificationChannelSelected?.id === '0') {
			setNameChildren(`Mute @${name}`);

			setmutedUntil('');
		} else {
			setNameChildren(`UnMute @${name}`);

			if (getNotificationChannelSelected?.time_mute) {
				const timeMute = new Date(getNotificationChannelSelected.time_mute);
				const currentTime = new Date();
				if (timeMute > currentTime) {
					const timeDifference = timeMute.getTime() - currentTime.getTime();
					const formattedDate = format(timeMute, 'dd/MM, HH:mm');
					setmutedUntil(`Muted until ${formattedDate}`);

					setTimeout(() => {
						const body = {
							channel_id: directMessageValue?.dmID || '',
							notification_type: getNotificationChannelSelected?.notification_setting_type || 0,
							clan_id: '',
							active: 1,
							is_current_channel: directMessageValue?.dmID === directId
						};
						dispatch(notificationSettingActions.setMuteNotificationSetting(body));
					}, timeDifference);
				}
			}
		}
	}, [getNotificationChannelSelected]);

	const muteOrUnMuteChannel = (active: number) => {
		const body = {
			channel_id: directMessageValue?.dmID || '',
			notification_type: 0,
			clan_id: '',
			active: active,
			is_current_channel: directMessageValue?.dmID === directId
		};
		dispatch(notificationSettingActions.setMuteNotificationSetting(body));
	};

	const handleScheduleMute = (duration: number) => {
		if (duration !== Infinity) {
			const now = new Date();
			const unmuteTime = new Date(now.getTime() + duration);
			const unmuteTimeISO = unmuteTime.toISOString();

			const body: SetNotificationPayload = {
				channel_id: directMessageValue?.dmID || '',
				notification_type: 0,
				clan_id: '',
				time_mute: unmuteTimeISO,
				is_current_channel: directMessageValue?.dmID === directId,
				is_direct: directMessageValue?.type === ChannelType.CHANNEL_TYPE_DM || directMessageValue?.type === ChannelType.CHANNEL_TYPE_GROUP
			};
			dispatch(notificationSettingActions.setNotificationSetting(body));
		} else {
			const body: SetMuteNotificationPayload = {
				channel_id: directMessageValue?.dmID || '',
				notification_type: 0,
				clan_id: '',
				active: 0,
				is_current_channel: directMessageValue?.dmID === directId
			};
			dispatch(notificationSettingActions.setMuteNotificationSetting(body));
		}
	};

	const RemoveMemberFromPrivateThread = useCallback(
		async (userId: string) => {
			if (userId !== userProfile?.user?.id) {
				const body: removeChannelUsersPayload = {
					channelId: currentChannel?.channel_id as string,
					userId: userId,
					channelType: currentChannel?.type,
					clanId: currentClan?.clan_id as string
				};
				await dispatch(channelUsersActions.removeChannelUsers(body));
			}
		},
		[currentChannel?.channel_id, currentChannel?.type, currentClan?.clan_id, userProfile?.user?.id]
	);

	const isPrivateThread = currentChannel?.type === ChannelType.CHANNEL_TYPE_THREAD && currentChannel.channel_private;

	return (
		<div
			ref={panelRef}
			tabIndex={-1}
			onMouseDown={(e) => e.stopPropagation()}
			style={{
				left: coords.mouseX,
				bottom: positionTop ? '12px' : 'auto',
				top: positionTop ? 'auto' : coords.mouseY,
				boxShadow: 'rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px'
			}}
			className="outline-none fixed top-full  z-20 w-[200px] py-[10px] px-[10px] border border-slate-300 dark:border-none rounded"
			onClick={(e) => {
				e.stopPropagation();
				onClose();
			}}
		>
			{directMessageValue && checkDmGroup ? (
				<PanelGroupDM isDmGroupOwner={isDmGroupOwner} dmGroupId={directMessageValue.dmID} lastOne={!directMessageValue.userId.length} />
			) : (
				<>
					<GroupPanelMember>
						<ItemPanelMember children="Mark As Read" onClick={() => handleMarkAsRead(directMessageValue?.dmID ?? '')} />
						{/* <ItemPanelMember
							children={!directMessageValue?.e2ee ? 'Enable E2EE' : 'Disable E2EE'}
							onClick={() => handleEnableE2ee(directMessageValue?.dmID, directMessageValue?.e2ee)}
						/> */}
						<ItemPanelMember children="Profile" onClick={handleOpenProfile} />
						{/* {directMessageValue ? (
							checkDm && <ItemPanelMember children="Call" />
						) : (
							<ItemPanelMember children="Mention" onClick={handleClickMention} />
						)} */}

						{!isSelf && (
							<>
								{!checkDm && (
									<>
										<ItemPanelMember children="Message" onClick={handleDirectMessageWithUser} />
										{/* <ItemPanelMember children="Call" /> */}
									</>
								)}
								{/* <ItemPanelMember children="Add Friend Nickname" /> */}
							</>
						)}
						{/* {directMessageValue && <ItemPanelMember children="Close DM" />} */}
					</GroupPanelMember>
					{isMemberDMGroup && dataMemberCreate?.createId === userProfile?.user?.id && (
						<GroupPanelMember>
							<ItemPanelMember children="Remove From Group" onClick={handleRemoveMemberChannel} danger />
							{/* <ItemPanelMember children="Make Group Owner" danger /> */}
						</GroupPanelMember>
					)}

					{!isMemberDMGroup && (
						<GroupPanelMember>
							{/* {!isSelf && !directMessageValue && <ItemPanelMember children="Mute" type="checkbox" />} */}
							{isSelf && <ItemPanelMember children="Edit Clan Profile" onClick={handleOpenClanProfileSetting} />}
							{!isSelf && (
								<>
									{hasAddFriend === EStateFriend.FRIEND ? (
										<ItemPanelMember
											children="Remove Friend"
											onClick={() => {
												deleteFriend(friendInfor.name, friendInfor.id);
											}}
										/>
									) : (
										<ItemPanelMember
											children="Add Friend"
											onClick={() => {
												addFriend({ usernames: [friendInfor.name], ids: [] });
											}}
										/>
									)}
									{/* <ItemPanelMember children="Block" /> */}
								</>
							)}
						</GroupPanelMember>
					)}
					{isMemberDMGroup && !isSelf && (
						<>
							{!isSelf && (
								<>
									{hasAddFriend === EStateFriend.FRIEND ? (
										<ItemPanelMember children="Remove Friend" onClick={() => deleteFriend(friendInfor.name, friendInfor.id)} />
									) : (
										<ItemPanelMember
											children="Add Friend"
											onClick={() => addFriend({ usernames: [friendInfor.name], ids: [] })}
										/>
									)}
									<ItemPanelMember children="Block" />
								</>
							)}
						</>
					)}

					{/* {directMessageValue && (
						<GroupPanelMember>
							{getNotificationChannelSelected?.active === 1 || getNotificationChannelSelected?.id === '0' ? (
								<Dropdown
									trigger="hover"
									dismissOnClick={false}
									renderTrigger={() => (
										<div>
											<ItemPanel children={nameChildren} dropdown="change here" onClick={() => muteOrUnMuteChannel(0)} />
										</div>
									)}
									label=""
									placement="right-start"
									className="dark:!bg-bgProfileBody bg-gray-100 border-none ml-[3px] py-[6px] px-[8px] w-[200px]"
								>
									<ItemPanel children="For 15 Minutes" onClick={() => handleScheduleMute(FOR_15_MINUTES)} />
									<ItemPanel children="For 1 Hour" onClick={() => handleScheduleMute(FOR_1_HOUR)} />
									<ItemPanel children="For 3 Hour" onClick={() => handleScheduleMute(FOR_3_HOURS)} />
									<ItemPanel children="For 8 Hour" onClick={() => handleScheduleMute(FOR_8_HOURS)} />
									<ItemPanel children="For 24 Hour" onClick={() => handleScheduleMute(FOR_24_HOURS)} />
									<ItemPanel children="Until I turn it back on" onClick={() => handleScheduleMute(Infinity)} />
								</Dropdown>
							) : (
								<ItemPanel children={nameChildren} onClick={() => muteOrUnMuteChannel(1)} subText={mutedUntil} />
							)}
						</GroupPanelMember>
					)} */}
					{!isSelf && (hasClanOwnerPermission || (hasAdminPermission && !memberIsClanOwner)) && (
						<GroupPanelMember>
							<ItemPanelMember onClick={handleRemoveMember} children={`Kick ${member?.user?.username}`} danger />
							{isPrivateThread && (
								<ItemPanelMember
									onClick={() => RemoveMemberFromPrivateThread(member?.user?.id as string)}
									children={`Remove ${member?.user?.username} from this thread`}
									danger
								/>
							)}
						</GroupPanelMember>
					)}
					{!isSelf && isPrivateThread && isCreator && !(hasClanOwnerPermission || (hasAdminPermission && !memberIsClanOwner)) && (
						<GroupPanelMember>
							<ItemPanelMember
								onClick={() => RemoveMemberFromPrivateThread(member?.user?.id as string)}
								children={`Remove ${member?.user?.username} from this thread`}
								danger
							/>
						</GroupPanelMember>
					)}
				</>
			)}
		</div>
	);
};

export default PanelMember;
