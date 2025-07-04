import { size, useTheme } from '@mezon/mobile-ui';
import { MediaType, selectAllStickerSuggestion, selectCurrentClan, useAppSelector } from '@mezon/store';
import { memo, useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { ScrollView } from 'react-native-gesture-handler';
import Sticker from '../Sticker';
import { style } from '../styles';

type IReactionSoundEffectProps = {
	onSelected?: (soundId: string) => void;
};

const ReactionSoundEffect = ({ onSelected }: IReactionSoundEffectProps) => {
	const { themeValue } = useTheme();
	const styles = style(themeValue);
	const [selectedType, setSelectedType] = useState('');

	const currentClan = useAppSelector(selectCurrentClan);
	const allSounds = useAppSelector(selectAllStickerSuggestion);

	const clanSoundEffect = useMemo(() => {
		return allSounds?.filter((sound) => (sound as any).media_type === MediaType.AUDIO);
	}, [allSounds]);

	const categoryLogo = useMemo(() => {
		if (clanSoundEffect?.length === 0) return [];

		return clanSoundEffect
			?.map((sound) => ({
				id: sound?.clan_id,
				type: sound?.clan_name,
				url: sound?.logo
			}))
			?.filter((sound, index, self) => index === self?.findIndex((s) => s?.id === sound?.id));
	}, [clanSoundEffect]);

	const sounds = useMemo(() => {
        if (clanSoundEffect?.length === 0) return [];

		return clanSoundEffect?.map((sound) => ({
			id: sound?.id,
			url: sound?.source,
			type: sound?.clan_name,
			name: sound?.shortname
		}));
	}, [clanSoundEffect]);

	const handlePressCategory = (name: string) => {
		setSelectedType(name);
	};

    const handleClickSound = useCallback((sound: any) => {
        onSelected && onSelected(sound?.id);
    }, [onSelected]);

	return (
		<View style={{ padding: size.s_10 }}>
			<ScrollView horizontal contentContainerStyle={styles.btnWrap}>
				{categoryLogo?.length > 0 &&
					categoryLogo?.map((item, index) => (
						<TouchableOpacity key={`logo_${index}_${item?.type}`} onPress={() => handlePressCategory(item?.type)} style={styles.btnEmo}>
							<FastImage
								resizeMode={FastImage.resizeMode.cover}
								source={{
									uri: item?.url || currentClan?.logo || '',
									cache: FastImage.cacheControl.immutable,
									priority: FastImage.priority.high
								}}
								style={{ height: '100%', width: '100%' }}
							/>
						</TouchableOpacity>
					))}
			</ScrollView>

			{!selectedType
				? categoryLogo?.length > 0 &&
					categoryLogo?.map((item, index) => (
						<Sticker
							key={`${index}_${item?.type}`}
							stickerList={sounds}
							onClickSticker={handleClickSound}
							categoryName={item?.type}
							isAudio={true}
						/>
					))
				: [
						<Sticker
							key={`selected_${selectedType}`}
							stickerList={sounds}
							onClickSticker={handleClickSound}
							categoryName={selectedType}
							isAudio={true}
						/>
					]}
		</View>
	);
};

export default memo(ReactionSoundEffect);
