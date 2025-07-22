import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { usePermissionChecker, useRoles } from '@mezon/core';
import { CheckIcon } from '@mezon/mobile-components';
import { Colors, size, useTheme, verticalScale } from '@mezon/mobile-ui';
import { selectAllRolesClan, selectAllUserClans } from '@mezon/store-mobile';
import { EPermission, UsersClanEntity } from '@mezon/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, Pressable, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import MezonIconCDN from '../../../componentUI/MezonIconCDN';
import MezonInput from '../../../componentUI/MezonInput';
import { SeparatorWithLine } from '../../../components/Common';
import { IconCDN } from '../../../constants/icon_cdn';
import { APP_SCREEN, MenuClanScreenProps } from '../../../navigation/ScreenTypes';
import { normalizeString } from '../../../utils/helpers';
import { AddMemberBS } from './components/AddMemberBs';
import { MemberItem } from './components/MemberItem';

type SetupMembersScreen = typeof APP_SCREEN.MENU_CLAN.SETUP_ROLE_MEMBERS;
export const SetupMembers = ({ navigation, route }: MenuClanScreenProps<SetupMembersScreen>) => {
	const roleId = route.params?.roleId;
	const { t } = useTranslation('clanRoles');
	const rolesClan = useSelector(selectAllRolesClan);
	const usersClan = useSelector(selectAllUserClans);
	const [selectedMemberIdList, setSelectedMemberIdList] = useState<string[]>([]);
	const [searchMemberText, setSearchMemberText] = useState('');
	const { themeValue } = useTheme();
	const { updateRole } = useRoles();
	const clanRole = useMemo(() => {
		return rolesClan?.find((r) => r?.id === roleId);
	}, [roleId, rolesClan]);
	const [hasAdminPermission, hasManageClanPermission, isClanOwner] = usePermissionChecker([
		EPermission.administrator,
		EPermission.manageClan,
		EPermission.clanOwner
	]);

	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const [assignedMemberList, setAssignedMemberList] = useState<UsersClanEntity[]>([]);
	const [unAssignedMemberList, setUnAssignedMemberList] = useState<UsersClanEntity[]>([]);

	//Note: create new role
	const newRole = useMemo(() => {
		return rolesClan?.[rolesClan.length - 1];
	}, [rolesClan]);

	const isEditRoleMode = useMemo(() => {
		return Boolean(roleId);
	}, [roleId]);

	const isCanEditRole = useMemo(() => {
		return hasAdminPermission || isClanOwner || hasManageClanPermission;
	}, [hasAdminPermission, hasManageClanPermission, isClanOwner]);

	useEffect(() => {
		navigation.setOptions({
			headerStatusBarHeight: Platform.OS === 'android' ? 0 : undefined,
			headerTitle: !isEditRoleMode
				? t('setupMember.title')
				: () => {
						return (
							<View>
								<Text
									style={{
										textAlign: 'center',
										fontWeight: 'bold',
										fontSize: verticalScale(18),
										color: themeValue.white
									}}
								>
									{clanRole?.title}
								</Text>
								<Text
									style={{
										textAlign: 'center',
										color: themeValue.text
									}}
								>
									{t('roleDetail.role')}
								</Text>
							</View>
						);
					},
			headerLeft: () => {
				if (isEditRoleMode) {
					return (
						<Pressable style={{ padding: 20 }} onPress={() => navigation.goBack()}>
							<MezonIconCDN icon={IconCDN.arrowLargeLeftIcon} height={20} width={20} color={themeValue.textStrong} />
						</Pressable>
					);
				}
				return (
					<Pressable style={{ padding: 20 }} onPress={() => navigation.navigate(APP_SCREEN.MENU_CLAN.ROLE_SETTING)}>
						<MezonIconCDN icon={IconCDN.closeSmallBold} height={20} width={20} color={themeValue.textStrong} />
					</Pressable>
				);
			}
		});
	}, [clanRole?.title, isEditRoleMode, navigation, t, themeValue?.text, themeValue.textStrong, themeValue?.white]);

	const setInitialSelectedMember = useCallback(() => {
		const assignedMemberIds = clanRole?.role_user_list?.role_users?.map((user) => user?.id);
		const membersInRole = usersClan?.filter((user) => assignedMemberIds?.includes(user?.user?.id));
		const membersNotInRole = usersClan?.filter((user) => !assignedMemberIds?.includes(user?.user?.id));
		setAssignedMemberList(membersInRole);
		setUnAssignedMemberList(membersNotInRole);
	}, [clanRole?.role_user_list?.role_users, usersClan]);

	useEffect(() => {
		if (clanRole?.id) {
			setInitialSelectedMember();
		}
	}, [clanRole]);

	const onSelectMemberChange = (value: boolean, memberId: string) => {
		const uniqueSelectedMembers = new Set(selectedMemberIdList);
		if (value) {
			uniqueSelectedMembers.add(memberId);
			setSelectedMemberIdList([...uniqueSelectedMembers]);
			return;
		}
		uniqueSelectedMembers.delete(memberId);
		setSelectedMemberIdList([...uniqueSelectedMembers]);
	};

	const updateMemberToRole = async () => {
		const selectedPermissions = newRole?.permission_list?.permissions.filter((it) => it?.active).map((it) => it?.id);
		const response = await updateRole(
			newRole?.clan_id,
			newRole?.id,
			newRole?.title,
			newRole?.color || '',
			selectedMemberIdList,
			selectedPermissions,
			[],
			[]
		);
		if (response) {
			navigation.navigate(APP_SCREEN.MENU_CLAN.ROLE_SETTING);
			Toast.show({
				type: 'success',
				props: {
					text2: t('setupMember.addedMember'),
					leadingIcon: <CheckIcon color={Colors.green} width={20} height={20} />
				}
			});
		} else {
			Toast.show({
				type: 'success',
				props: {
					text2: t('failed'),
					leadingIcon: <MezonIconCDN icon={IconCDN.closeIcon} color={Colors.red} width={20} height={20} />
				}
			});
		}
	};

	const filteredMemberList = useMemo(() => {
		const memberList = isEditRoleMode ? assignedMemberList : usersClan;
		return memberList?.filter(
			(it) =>
				normalizeString(it?.user?.display_name).includes(normalizeString(searchMemberText)) ||
				normalizeString(it?.user?.username).includes(normalizeString(searchMemberText)) ||
				normalizeString(it?.clan_nick).includes(normalizeString(searchMemberText))
		);
	}, [searchMemberText, assignedMemberList, isEditRoleMode, usersClan]);

	const openAddMemberBottomSheet = () => {
		bottomSheetRef.current?.present();
	};

	const onClose = useCallback(() => {
		bottomSheetRef.current?.dismiss();
	}, []);

	return (
		<TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
			<View style={{ backgroundColor: themeValue.primary, flex: 1, paddingHorizontal: size.s_14 }}>
				<View style={{ flex: 1, paddingTop: size.s_10 }}>
					{!isEditRoleMode && (
						<View
							style={{
								paddingVertical: size.s_10,
								borderBottomWidth: 1,
								borderBottomColor: themeValue.borderDim,
								marginBottom: size.s_20
							}}
						>
							<Text
								style={{
									color: themeValue.white,
									textAlign: 'center',
									fontWeight: 'bold',
									fontSize: verticalScale(24)
								}}
							>
								{t('setupMember.addMember')}
							</Text>
							<Text
								style={{
									color: themeValue.text,
									textAlign: 'center'
								}}
							>
								{t('setupMember.description')}
							</Text>
						</View>
					)}

					<MezonInput value={searchMemberText} onTextChange={setSearchMemberText} placeHolder={t('setupMember.searchMembers')} />

					{isEditRoleMode && (
						<TouchableOpacity onPress={openAddMemberBottomSheet}>
							<View
								style={{
									flexDirection: 'row',
									backgroundColor: themeValue.secondary,
									padding: size.s_10,
									borderRadius: size.s_6,
									gap: size.s_10,
									justifyContent: 'center'
								}}
							>
								<MezonIconCDN icon={IconCDN.circlePlusPrimaryIcon} />
								<View style={{ flex: 1 }}>
									<Text
										style={{
											color: themeValue.text
										}}
									>
										{t('setupMember.addMember')}
									</Text>
								</View>
								<MezonIconCDN icon={IconCDN.chevronSmallRightIcon} />
							</View>
						</TouchableOpacity>
					)}
					<View style={{ marginVertical: size.s_10, flex: 1 }}>
						{filteredMemberList.length ? (
							<View style={{ borderRadius: size.s_10, overflow: 'hidden' }}>
								<FlatList
									data={filteredMemberList}
									keyExtractor={(item) => item?.id}
									ItemSeparatorComponent={SeparatorWithLine}
									initialNumToRender={1}
									maxToRenderPerBatch={1}
									windowSize={2}
									renderItem={({ item }) => {
										return (
											<MemberItem
												member={item}
												role={isEditRoleMode ? clanRole : newRole}
												isSelectMode={!isEditRoleMode}
												isSelected={selectedMemberIdList?.includes(item?.id)}
												onSelectChange={onSelectMemberChange}
												disabled={isEditRoleMode ? !isCanEditRole : false}
											/>
										);
									}}
								/>
							</View>
						) : (
							<View>
								<Text
									style={{
										color: themeValue.text,
										textAlign: 'center'
									}}
								>
									{t('setupMember.noMembersFound')}
								</Text>
							</View>
						)}
					</View>
				</View>

				{!isEditRoleMode ? (
					<View style={{ marginBottom: size.s_16, gap: size.s_10 }}>
						<TouchableOpacity onPress={() => updateMemberToRole()}>
							<View style={{ backgroundColor: Colors.bgViolet, paddingVertical: size.s_14, borderRadius: size.s_8 }}>
								<Text
									style={{
										color: 'white',
										textAlign: 'center'
									}}
								>
									{t('setupMember.finish')}
								</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity onPress={() => navigation.navigate(APP_SCREEN.MENU_CLAN.ROLE_SETTING)}>
							<View style={{ paddingVertical: size.s_14, borderRadius: size.s_8 }}>
								<Text
									style={{
										color: themeValue.text,
										textAlign: 'center'
									}}
								>
									{t('skipStep')}
								</Text>
							</View>
						</TouchableOpacity>
					</View>
				) : (
					<AddMemberBS bottomSheetRef={bottomSheetRef} memberList={unAssignedMemberList} role={clanRole} onClose={onClose} />
				)}
			</View>
		</TouchableWithoutFeedback>
	);
};
