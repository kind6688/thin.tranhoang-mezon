import { ActionEmitEvent } from '@mezon/mobile-components';
import { useTheme } from '@mezon/mobile-ui';
import { categoriesActions, selectCategoryExpandStateByCategoryId, useAppDispatch, useAppSelector } from '@mezon/store-mobile';
import { ICategoryChannel } from '@mezon/utils';
import React, { memo, useCallback } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import CategoryMenu from '../../CategoryMenu';
import ChannelListSectionHeader from '../ChannelListSectionHeader';
import { style } from './styles';

interface IChannelListSectionProps {
	data: ICategoryChannel;
}

const ChannelListSection = memo(({ data }: IChannelListSectionProps) => {
	const styles = style(useTheme().themeValue);
	const dispatch = useAppDispatch();
	const categoryExpandState = useAppSelector((state) => selectCategoryExpandStateByCategoryId(state, data?.category_id));

	const toggleCollapse = useCallback(
		(category: ICategoryChannel) => {
			const payload = {
				clanId: category.clan_id || '',
				categoryId: category.id,
				expandState: !categoryExpandState
			};
			dispatch(categoriesActions.setCategoryExpandState(payload));
		},
		[dispatch, categoryExpandState]
	);

	const onLongPressHeader = useCallback(() => {
		const dataBottomSheet = {
			heightFitContent: true,
			children: <CategoryMenu category={data} />
		};
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_BOTTOM_SHEET, { isDismiss: false, data: dataBottomSheet });
	}, [data]);

	if (!data?.category_name?.trim()) {
		return;
	}

	return (
		<View style={styles.channelListSection}>
			<ChannelListSectionHeader
				title={data.category_name}
				onPress={toggleCollapse}
				onLongPress={onLongPressHeader}
				isCollapsed={categoryExpandState}
				category={data}
			/>

			{/* {(data?.channels as IChannel[])?.map((item: IChannel, index: number) => {
				return (
					<View key={`${item.id}_channel_item` + index} onLayout={(event) => handlePositionChannel(item, event)}>
						<ChannelListItem
							data={item}
							isFirstThread={
								item?.type === ChannelType.CHANNEL_TYPE_THREAD &&
								(data?.channels?.[index - 1] as IChannel)?.type !== ChannelType.CHANNEL_TYPE_THREAD
							}
						/>
					</View>
				);
			})} */}
		</View>
	);
});
export default ChannelListSection;
