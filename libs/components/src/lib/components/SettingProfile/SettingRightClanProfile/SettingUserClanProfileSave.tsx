import { getSelectedRoleId } from '@mezon/store';
import { ButtonLoading } from '@mezon/ui';
import { useSelector } from 'react-redux';

export type ModalSettingSave = {
	flagOption: boolean;
	handleClose: () => void;
	handleSaveClose: () => void;
	handleUpdateUser: () => Promise<void>;
};
export type SettingUserClanProfileSaveProps = {
	PropsSave: ModalSettingSave;
};

export const SettingUserClanProfileSave = (props: SettingUserClanProfileSaveProps) => {
	const { PropsSave } = props;
	const clickRole = useSelector(getSelectedRoleId);
	const handleSaveChanges = async () => {
		await PropsSave.handleUpdateUser();
		PropsSave.handleSaveClose();
	};
	return PropsSave.flagOption || clickRole === 'New Role' ? (
		<div className="flex flex-row gap-2 dark:bg-bgProfileBody bg-bgLightSecondary text-theme-primary text-sm font-medium absolute max-w-[815px] w-full left-1/2 translate-x-[-50%] bottom-2 min-w-96 h-fit p-2.5 rounded transform z-10 shadow-sm dark:shadow-gray-400 shadow-gray-600">
			<div className="flex-1 flex items-center">
				<p className="text-base">Careful - you have unsaved changes!</p>
			</div>
			<div className="flex flex-row justify-end gap-3">
				<button
					className="rounded px-4 py-1.5 hover:underline"
					onClick={() => {
						PropsSave.handleClose();
					}}
				>
					Reset
				</button>
				<ButtonLoading
					className="ml-auto bg-blue-600 rounded-[4px] px-4 py-1.5 text-nowrap text-white"
					label="Save Changes"
					onClick={handleSaveChanges}
				/>
			</div>
		</div>
	) : null;
};
