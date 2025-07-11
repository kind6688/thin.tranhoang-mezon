import { FileIcon } from '@mezon/mobile-components';
import { Colors, size, useTheme } from '@mezon/mobile-ui';
import { selectMemberClanByUserId2, useAppSelector } from '@mezon/store-mobile';
import { IAttachmentEntity, convertTimeString } from '@mezon/utils';
import { memo } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { style } from './styles';

type ChannelFileItemProps = {
	file: IAttachmentEntity;
};

const ChannelFileItem = memo(({ file }: ChannelFileItemProps) => {
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const userSendAttachment = useAppSelector((state) => selectMemberClanByUserId2(state, file?.uploader ?? ''));
	const username = userSendAttachment?.user?.username;
	const attachmentSendTime = convertTimeString(file?.create_time as string);

	const onPressItem = () => {
		Linking.openURL(file?.url);
	};

	return (
		<TouchableOpacity style={styles.container} onPress={onPressItem}>
			<FileIcon height={size.s_34} width={size.s_34} color={Colors.bgViolet} />
			<View>
				<Text style={[styles.fileName, { color: Colors.bgViolet }]} numberOfLines={1} ellipsizeMode="tail">
					{file?.filename}
				</Text>
				<View style={styles.footer}>
					<Text style={styles.footerTitle} numberOfLines={1} ellipsizeMode="tail">
						shared by {username}
					</Text>
					<Text style={styles.footerTime} numberOfLines={1}>
						{attachmentSendTime}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
});

export default ChannelFileItem;
