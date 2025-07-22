import { useMyRole } from '@mezon/core';
import { ActionEmitEvent, isEqual } from '@mezon/mobile-components';
import { Colors, size, useTheme, verticalScale } from '@mezon/mobile-ui';
import { useAppSelector } from '@mezon/store';
import { permissionRoleChannelActions, selectAllPermissionRoleChannel, selectPermissionChannel, useAppDispatch } from '@mezon/store-mobile';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import MezonConfirm from '../../../componentUI/MezonConfirm';
import MezonIconCDN from '../../../componentUI/MezonIconCDN';
import { IconCDN } from '../../../constants/icon_cdn';
import { APP_SCREEN, MenuChannelScreenProps } from '../../../navigation/ScreenTypes';
import { PermissionItem } from '../components/PermissionItem';
import { EOverridePermissionType, EPermissionStatus, ERequestStatus } from '../types/channelPermission.enum';
import { IPermissionSetting } from '../types/channelPermission.type';

type AdvancedPermissionOverrides = typeof APP_SCREEN.MENU_CHANNEL.ADVANCED_PERMISSION_OVERRIDES;
export const AdvancedPermissionOverrides = ({ navigation, route }: MenuChannelScreenProps<AdvancedPermissionOverrides>) => {
	const { channelId, clanId, id, type } = route.params;
	const dispatch = useAppDispatch();
	const { themeValue } = useTheme();
	const { t } = useTranslation(['channelSetting']);
	const channelPermissionList = useSelector(selectPermissionChannel);
	const changedChannelPermissionList = useAppSelector((state) => selectAllPermissionRoleChannel(state, channelId));
	const [originChannelPermissionValues, setOriginChannelPermissionValues] = useState<IPermissionSetting>();
	const [currentChannelPermissionValues, setCurrentChannelPermissionValues] = useState<IPermissionSetting>();
	const { maxPermissionId } = useMyRole();

	const isSettingNotChange = useMemo(() => {
		return isEqual(originChannelPermissionValues, currentChannelPermissionValues);
	}, [originChannelPermissionValues, currentChannelPermissionValues]);

	//override Role permission in channel
	const isOverrideRole = useMemo(() => {
		return EOverridePermissionType.Role === type;
	}, [type]);

	const saveChannelPermission = async () => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: true });
		const permissionValueList = channelPermissionList?.reduce((acc, permission) => {
			const { slug, id } = permission;
			const permissionValue = {
				permission_id: id,
				type: currentChannelPermissionValues[id],
				slug
			};
			return [...acc, permissionValue];
		}, []);

		const updatePermissionPayload = {
			channelId,
			maxPermissionId,
			permission: permissionValueList,
			roleId: isOverrideRole ? id : '',
			userId: isOverrideRole ? '' : id,
			clanId: clanId
		};
		const response = await dispatch(permissionRoleChannelActions.setPermissionRoleChannel(updatePermissionPayload));

		const isError = response?.meta?.requestStatus === ERequestStatus.Rejected;
		Toast.show({
			type: 'success',
			props: {
				text2: isError ? t('channelPermission.toast.failed') : t('channelPermission.toast.success'),
				leadingIcon: isError ? (
					<MezonIconCDN icon={IconCDN.closeIcon} color={Colors.red} />
				) : (
					<MezonIconCDN icon={IconCDN.checkmarkLargeIcon} color={Colors.green} />
				)
			}
		});
	};

	const handleBack = useCallback(() => {
		if (isSettingNotChange) {
			navigation.goBack();
			return;
		}
		const data = {
			children: (
				<MezonConfirm
					onConfirm={saveChannelPermission}
					onCancel={() => {
						navigation?.goBack();
					}}
					title={t('channelPermission.warningChangeSettingModal.title')}
					confirmText={t('channelPermission.warningChangeSettingModal.confirm')}
					content={t('channelPermission.warningChangeSettingModal.content')}
				/>
			)
		};
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: false, data });
	}, [navigation, isSettingNotChange]);

	useEffect(() => {
		navigation.setOptions({
			headerStatusBarHeight: Platform.OS === 'android' ? 0 : undefined,
			headerTitle: () => (
				<View>
					<Text
						style={{
							fontSize: verticalScale(20),
							marginLeft: 0,
							marginRight: 0,
							fontWeight: 'bold',
							color: themeValue.white
						}}
					>
						{t('channelPermission.permissionOverrides')}
					</Text>
				</View>
			),
			headerRight: () => {
				if (isSettingNotChange) return null;
				return (
					<TouchableOpacity onPress={saveChannelPermission}>
						<View style={{ marginRight: size.s_20, paddingVertical: size.s_10 }}>
							<Text
								style={{
									fontSize: verticalScale(18),
									marginLeft: 0,
									marginRight: 0,
									color: Colors.textViolet
								}}
							>
								{t('channelPermission.save')}
							</Text>
						</View>
					</TouchableOpacity>
				);
			},
			headerLeft: () => {
				return (
					<TouchableOpacity onPress={handleBack}>
						<View style={{ marginLeft: size.s_16 }}>
							<MezonIconCDN icon={IconCDN.arrowLargeLeftIcon} color={themeValue.white} height={size.s_22} width={size.s_22} />
						</View>
					</TouchableOpacity>
				);
			}
		});
	}, [isSettingNotChange, navigation, saveChannelPermission, t, themeValue.white]);

	const onPermissionStatusChange = useCallback(
		(permissionId: string, status: EPermissionStatus) => {
			if (currentChannelPermissionValues?.[permissionId] === status) return;
			const newChannelPermissionValues = { ...currentChannelPermissionValues, [permissionId]: status };
			setCurrentChannelPermissionValues(newChannelPermissionValues);
		},
		[currentChannelPermissionValues]
	);

	const setInitialPermissionValues = () => {
		const nonDefaultValues = changedChannelPermissionList?.permission_role_channel?.reduce((acc, permission) => {
			return { ...acc, [permission.permission_id]: permission?.active ? EPermissionStatus.Allow : EPermissionStatus.Deny };
		}, {});
		const initialPermissionValue = channelPermissionList?.reduce((acc, permission) => {
			if (nonDefaultValues?.[permission?.id]) {
				return { ...acc, [permission?.id]: nonDefaultValues?.[permission?.id] };
			}
			return { ...acc, [permission?.id]: EPermissionStatus.None };
		}, {});
		setOriginChannelPermissionValues(initialPermissionValue);
		setCurrentChannelPermissionValues(initialPermissionValue);
	};

	useEffect(() => {
		if (changedChannelPermissionList) {
			setInitialPermissionValues();
		}
	}, [changedChannelPermissionList]);

	useEffect(() => {
		if (channelId && id) {
			if (isOverrideRole) {
				dispatch(
					permissionRoleChannelActions.fetchPermissionRoleChannel({
						channelId: channelId,
						roleId: id,
						userId: ''
					})
				);
			} else {
				dispatch(
					permissionRoleChannelActions.fetchPermissionRoleChannel({
						channelId: channelId,
						roleId: '',
						userId: id
					})
				);
			}
		}
	}, [channelId, dispatch, id, type, isOverrideRole]);

	return (
		<View style={{ flex: 1, backgroundColor: themeValue.primary, paddingHorizontal: size.s_18, gap: size.s_18 }}>
			<Text
				style={{
					color: themeValue.textDisabled
				}}
			>
				{t('channelPermission.generalChannelPermission')}
			</Text>

			<ScrollView>
				<View style={{ gap: size.s_28 }}>
					{channelPermissionList?.map((permission) => {
						return (
							<PermissionItem
								key={permission?.id}
								permission={permission}
								status={currentChannelPermissionValues?.[permission?.id]}
								onPermissionStatusChange={onPermissionStatusChange}
							/>
						);
					})}
				</View>
			</ScrollView>
		</View>
	);
};
