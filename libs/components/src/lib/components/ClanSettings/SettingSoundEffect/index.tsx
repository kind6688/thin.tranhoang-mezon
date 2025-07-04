import {
	MediaType,
	selectAudioByClanId,
	selectCurrentClanId,
	selectCurrentUserId,
	selectMemberClanByUserId,
	soundEffectActions,
	useAppDispatch,
	useAppSelector
} from '@mezon/store';
import { Icons } from '@mezon/ui';
import { ClanSticker } from 'mezon-js';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ModalUploadSound from './ModalUploadSound';

interface ExtendedClanSticker extends ClanSticker {
	media_type?: MediaType;
}

export type SoundType = {
	id: string;
	name: string;
	url: string;
};

const isAudioFile = (url: string): boolean => {
	const lowerUrl = url.toLowerCase();
	return lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.mpeg');
};

const SettingSoundEffect = () => {
	const [showModal, setShowModal] = useState(false);
	const dispatch = useAppDispatch();
	const currentClanId = useSelector(selectCurrentClanId) || '';
	const currentUserId = useSelector(selectCurrentUserId) || '';

	const sounds = useAppSelector((state) => selectAudioByClanId(state, currentClanId));

	const soundList: SoundType[] = sounds.map((sound) => ({
		id: sound.id || '',
		name: sound.shortname || '',
		url: sound.source || ''
	}));

	useEffect(() => {
		dispatch(soundEffectActions.fetchSoundByUserId({ noCache: false }));
	}, [dispatch, currentClanId]);

	const handleUploadSuccess = (newSound: SoundType) => {
		setShowModal(false);

		dispatch(soundEffectActions.fetchSoundByUserId({ noCache: true }));
	};

	const handleDeleteSound = async (soundId: string, soundName: string) => {
		try {
			await dispatch(
				soundEffectActions.deleteSound({
					soundId: soundId,
					clan_id: currentClanId,
					soundLabel: soundName
				})
			);

			dispatch(soundEffectActions.fetchSoundByUserId({ noCache: true }));
		} catch (error) {
			console.error('Error deleting sound:', error);
		}
	};

	return (
		<div className="flex flex-col gap-6 pb-[40px] text-sm">
			<div className="flex flex-col gap-2 pb-6 border-b-theme-primary ">
				<div className="flex items-center gap-2 font-bold text-xs uppercase">
					<span>UPLOAD INSTRUCTIONS</span>
				</div>
				<p>
					Only accepts .mp3, .wav files, maximum 1MB. Use memorable names for sound effects. Sound effects will be used in clan
					notifications or events.
				</p>
			</div>
			<div className="flex p-4  rounded-lg shadow-sm hover:shadow-md transition duration-200 border-theme-primary">
				<div className="flex-1 w-full flex flex-col">
					<div className="flex items-center gap-2 text-base font-bold ">
						<span>Upload it here!</span>
					</div>
					<p className="text-xs mt-1">Personalize sound effects for your clan!</p>
				</div>
				<button
					className="bg-primary text-white rounded-lg py-2.5 px-4 font-semibold hover:bg-blue-600 transition duration-200 shadow-sm hover:shadow-md capitalize"
					onClick={() => setShowModal(true)}
				>
					<span className="flex items-center gap-2">Upload sound</span>
				</button>
			</div>
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-2 font-semibold text-sm ">
					<Icons.Speaker className="w-5 h-5 text-primary" />
					<span>Sound Effect List</span>
				</div>
				<div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{soundList.length === 0 && (
						<div className="col-span-full flex flex-col items-center justify-center py-10 border-2 border-dashed  border-color-theme rounded-lg bg-item-theme text-center">
							<Icons.Speaker className="w-10 h-10 mb-2" />
							<p className=" text-sm">No sound effects yet. Click "Upload sound" to add!</p>
						</div>
					)}
					{soundList.map((sound) => (
						<div
							key={sound.id}
							className="flex flex-col w-full p-4 border rounded-lg bg-white dark:bg-bgSecondary shadow-sm hover:shadow-md transition duration-200  border-gray-200"
						>
							<div className="flex items-center justify-between mb-3">
								<p className="font-semibold truncate w-full text-center ">{sound.name}</p>
								<button
									className="text-red-500 hover:text-red-600 transition duration-200 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10"
									onClick={() => handleDeleteSound(sound.id, sound.name)}
								>
									<Icons.CircleClose className="w-4 h-4" />
								</button>
							</div>
							<audio controls src={sound.url} className="w-full rounded-full border  border-gray-200" />
						</div>
					))}
				</div>
			</div>
			{showModal && <ModalUploadSound onSuccess={handleUploadSuccess} onClose={() => setShowModal(false)} />}
		</div>
	);
};

const CreatorInfo = ({ creatorId }: { creatorId: string }) => {
	const creator = useSelector(selectMemberClanByUserId(creatorId));

	if (!creator) return null;

	return (
		<div className="flex items-center justify-center gap-1 mt-1">
			<img className="w-4 h-4 rounded-full select-none object-cover" src={creator?.user?.avatar_url ?? process.env.NX_LOGO_MEZON} alt="" />
			<p className="text-xs dark:text-white text-textPrimaryLight max-w-20 truncate">{creator?.user?.username}</p>
		</div>
	);
};

export default SettingSoundEffect;
