import { Metrics, size, useTheme } from '@mezon/mobile-ui';
import { AttachmentEntity, selectAllListDocumentByChannel, useAppSelector } from '@mezon/store-mobile';
import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import useTabletLandscape from '../../hooks/useTabletLandscape';
import { normalizeString } from '../../utils/helpers';
import ChannelFileItem from './ChannelFileItem';
import ChannelFileSearch from './ChannelFileSearch';
import { style } from './styles';

const ChannelFiles = memo(({ currentChannelId }: { currentChannelId: string }) => {
	const isTabletLandscape = useTabletLandscape();
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const allAttachments = useAppSelector((state) => selectAllListDocumentByChannel(state, (currentChannelId ?? '') as string));
	const [searchText, setSearchText] = useState('');

	const filteredAttachments = useMemo(
		() => allAttachments.filter((attachment) => normalizeString(attachment?.filename).includes(normalizeString(searchText))),
		[allAttachments, searchText]
	);

	const renderItem = ({ item, index }: { item: AttachmentEntity; index: number }) => {
		return <ChannelFileItem key={`attachment_document_${item?.id}_${index}`} file={item} />;
	};

	const handleSearchChange = (text) => {
		setSearchText(text);
	};

	return (
		<View>
			<ChannelFileSearch onSearchTextChange={handleSearchChange} />
			<ScrollView
				style={{ height: (isTabletLandscape ? Dimensions.get('screen').height : Metrics.screenHeight) / (Platform.OS === 'ios' ? 1.4 : 1.3) }}
				contentContainerStyle={{ paddingBottom: size.s_50 }}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.container}>
					<FlashList data={filteredAttachments} renderItem={renderItem} estimatedItemSize={size.s_34 * 2} />
				</View>
			</ScrollView>
		</View>
	);
});

export default ChannelFiles;
