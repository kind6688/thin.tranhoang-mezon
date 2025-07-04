import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAuth, useCheckOwnerForUser } from '@mezon/core';
import { ActionEmitEvent } from '@mezon/mobile-components';
import { Colors, Text, size, useTheme } from '@mezon/mobile-ui';
import {
	appActions,
	channelsActions,
	fetchUserChannels,
	rolesClanActions,
	selectAllUserChannel,
	selectAllUserClans,
	selectEveryoneRole,
	selectRolesByChannelId,
	useAppDispatch
} from '@mezon/store-mobile';
import { isPublicChannel } from '@mezon/utils';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import MezonIconCDN from '../../../componentUI/MezonIconCDN';
import MezonSwitch from '../../../componentUI/MezonSwitch';
import { IconCDN } from '../../../constants/icon_cdn';
import { AddMemberOrRoleBS } from '../components/AddMemberOrRoleBS';
import { MemberItem } from '../components/MemberItem';
import { RoleItem } from '../components/RoleItem';
import { EOverridePermissionType, ERequestStatus } from '../types/channelPermission.enum';
import { IBasicViewProps } from '../types/channelPermission.type';

export const BasicView = memo(({ channel }: IBasicViewProps) => {
	const { themeValue } = useTheme();
	const { userId } = useAuth();
	const [checkClanOwner] = useCheckOwnerForUser();
	const dispatch = useAppDispatch();
	const { t } = useTranslation('channelSetting');
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const everyoneRole = useSelector(selectEveryoneRole);
	const allClanMembers = useSelector(selectAllUserClans);
	const [isChannelPublic, setIsChannelPublic] = useState<boolean>(isPublicChannel(channel));

	const listOfChannelRole = useSelector(selectRolesByChannelId(channel?.channel_id));
	const listOfChannelMember = useSelector(selectAllUserChannel(channel?.channel_id));

	useEffect(() => {
		dispatch(rolesClanActions.fetchRolesClan({ clanId: channel?.clan_id }));
		dispatch(fetchUserChannels({ channelId: channel?.channel_id }));
	}, [channel?.channel_id, channel?.clan_id]);

	const clanOwner = useMemo(() => {
		return allClanMembers?.find((member) => checkClanOwner(member?.user?.id));
	}, [allClanMembers, checkClanOwner]);

	const availableMemberList = useMemo(() => {
		if (channel?.channel_private) {
			return listOfChannelMember;
		}
		return [clanOwner];
	}, [channel?.channel_private, clanOwner, listOfChannelMember]);

	const availableRoleList = useMemo(() => {
		if (channel?.channel_private) {
			return listOfChannelRole?.filter((role) => typeof role?.role_channel_active === 'number' && role?.role_channel_active === 1);
		}
		return [everyoneRole];
	}, [listOfChannelRole, channel?.channel_private, everyoneRole]);

	const combineWhoCanAccessList = useMemo(() => {
		return [
			{ headerTitle: t('channelPermission.roles'), isShowHeader: availableRoleList?.length },
			...availableRoleList.map((role) => ({ ...role, type: EOverridePermissionType.Role })),
			{ headerTitle: t('channelPermission.members'), isShowHeader: availableMemberList?.length },
			...availableMemberList.map((member) => ({ ...member, type: EOverridePermissionType.Member }))
		];
	}, [availableMemberList, availableRoleList, t]);

	const onPrivateChannelChange = useCallback((value: boolean) => {
		setIsChannelPublic(!value);
		updateChannel(!value);
	}, []);

	const openBottomSheet = () => {
		bottomSheetRef.current?.present();
	};

	const updateChannel = useCallback(
		async (privateChannel: boolean) => {
			try {
				DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: true });
				dispatch(appActions.setLoadingMainMobile(true));

				const response = await dispatch(
					channelsActions.updateChannelPrivate({
						channel_id: channel.id,
						channel_private: privateChannel ? 1 : 0,
						user_ids: [userId],
						role_ids: []
					})
				);
				const isError = ERequestStatus.Rejected === response?.meta?.requestStatus;
				if (isError) {
					throw new Error();
				} else {
					Toast.show({
						type: 'success',
						props: {
							text2: t('channelPermission.toast.success'),
							leadingIcon: <MezonIconCDN icon={IconCDN.checkmarkLargeIcon} color={Colors.green} />
						}
					});
				}
			} catch (error) {
				setIsChannelPublic(isPublicChannel(channel));
				Toast.show({
					type: 'error',
					text1: t('channelPermission.toast.failed')
				});
			} finally {
				dispatch(appActions.setLoadingMainMobile(false));
			}
		},
		[channel, userId, t]
	);

	const renderWhoCanAccessItem = useCallback(
		({ item }) => {
			const { type, headerTitle, isShowHeader } = item;
			if (!type && headerTitle && isShowHeader) {
				return (
					<View style={{ paddingTop: size.s_12, paddingLeft: size.s_12 }}>
						<Text color={themeValue.white} h4>
							{headerTitle}:
						</Text>
					</View>
				);
			}
			switch (type) {
				case EOverridePermissionType.Member:
					if (!item?.user?.id || !item?.user?.username) return <View />;
					return <MemberItem member={item} channel={channel} />;
				case EOverridePermissionType.Role:
					return <RoleItem role={item} channel={channel} />;
				default:
					return <View />;
			}
		},
		[channel, themeValue]
	);

	const handlePressChangeChannelPrivate = useCallback(() => {
		onPrivateChannelChange(isChannelPublic);
	}, [isChannelPublic, onPrivateChannelChange]);

	return (
		<View style={{ flex: 1 }}>
			<TouchableOpacity onPress={handlePressChangeChannelPrivate}>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						padding: size.s_14,
						alignItems: 'center',
						borderRadius: size.s_14,
						backgroundColor: themeValue.primary,
						marginBottom: size.s_16
					}}
				>
					<View style={{ alignItems: 'center' }}>
						<Text color={themeValue.text}>{t('channelPermission.privateChannel')}</Text>
					</View>
					<MezonSwitch value={!isChannelPublic} onValueChange={onPrivateChannelChange} />
				</View>
			</TouchableOpacity>

			{Boolean(channel?.channel_private) && (
				<View>
					<Text color={themeValue.textDisabled}>{t('channelPermission.basicViewDescription')}</Text>

					<TouchableOpacity onPress={() => openBottomSheet()}>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								padding: size.s_14,
								alignItems: 'center',
								borderRadius: size.s_14,
								backgroundColor: themeValue.primary,
								marginVertical: size.s_16
							}}
						>
							<View style={{ flexDirection: 'row', gap: size.s_14, alignItems: 'center' }}>
								<MezonIconCDN icon={IconCDN.circlePlusPrimaryIcon} color={themeValue.text} />
								<Text color={themeValue.text}>{t('channelPermission.addMemberAndRoles')}</Text>
							</View>
							<MezonIconCDN icon={IconCDN.chevronSmallRightIcon} color={themeValue.text} />
						</View>
					</TouchableOpacity>
				</View>
			)}

			<View style={{ gap: size.s_10, marginBottom: size.s_10, flex: 1 }}>
				<Text color={themeValue.textDisabled}>{t('channelPermission.whoCanAccess')}</Text>
				<View style={{ backgroundColor: themeValue.primary, borderRadius: size.s_14, flex: 1 }}>
					<FlashList
						data={combineWhoCanAccessList}
						keyboardShouldPersistTaps={'handled'}
						renderItem={renderWhoCanAccessItem}
						keyExtractor={(item) => `${item?.id}_${item?.headerTitle}`}
						removeClippedSubviews={true}
					/>
				</View>
			</View>

			<AddMemberOrRoleBS bottomSheetRef={bottomSheetRef} channel={channel} />
		</View>
	);
});
