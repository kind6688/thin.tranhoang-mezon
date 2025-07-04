import { Metrics, size, useTheme } from '@mezon/mobile-ui';
import { AppDispatch, PinMessageEntity, pinMessageActions, selectPinMessageByChannelId, useAppSelector } from '@mezon/store-mobile';
import { IExtendedMessage } from '@mezon/utils';
import { safeJSONParse } from 'mezon-js';
import { memo, useEffect } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch } from 'react-redux';
import useTabletLandscape from '../../hooks/useTabletLandscape';
import EmptyPinMessage from './EmptyPinMessage';
import { style } from './PinMessage';
import PinMessageItem from './PinMessageItem';

const PinMessage = memo(({ currentChannelId }: { currentChannelId: string }) => {
	const isTabletLandscape = useTabletLandscape();
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const listPinMessages = useAppSelector((state) => selectPinMessageByChannelId(state, currentChannelId as string));
	const dispatch = useDispatch<AppDispatch>();

	useEffect(() => {
		dispatch(pinMessageActions.fetchChannelPinMessages({ channelId: currentChannelId }));
	}, [currentChannelId, dispatch]);

	const handleUnpinMessage = (message: PinMessageEntity) => {
		dispatch(pinMessageActions.deleteChannelPinMessage({ channel_id: currentChannelId, message_id: message.id }));
	};

	return (
		<View>
			<ScrollView
				style={{ height: (isTabletLandscape ? Dimensions.get('screen').height : Metrics.screenHeight) / (Platform.OS === 'ios' ? 1.4 : 1.3) }}
				contentContainerStyle={{ paddingBottom: size.s_50 }}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.containerPinMessage}>
					{listPinMessages?.length ? (
						listPinMessages.map((pinMessage) => {
							let contentString = pinMessage?.content;
							if (typeof contentString === 'string') {
								try {
									contentString = safeJSONParse(contentString);
								} catch (e) {
									console.error('Failed to parse content JSON:', e);
								}
							}

							return (
								<PinMessageItem
									pinMessageItem={pinMessage}
									contentMessage={contentString as IExtendedMessage}
									handleUnpinMessage={handleUnpinMessage}
								/>
							);
						})
					) : (
						<EmptyPinMessage />
					)}
				</View>
			</ScrollView>
		</View>
	);
});

export default PinMessage;
