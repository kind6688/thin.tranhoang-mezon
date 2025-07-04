import { useCategory } from '@mezon/core';
import { selectCurrentChannel, selectWelcomeChannelByClanId } from '@mezon/store';
import { ICategoryChannel, IChannel } from '@mezon/utils';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ItemObjProps, categorySettingList } from '../ClanSettings/ItemObj';
import SettingItem from '../ClanSettings/SettingItem';
import ModalConfirm from '../ModalConfirm';

interface ICategorySettingSidebarProps {
	onClickItem: (settingItem: ItemObjProps) => void;
	handleMenu: (value: boolean) => void;
	currentSetting: ItemObjProps;
	category: ICategoryChannel;
}

const CategorySettingSidebar: React.FC<ICategorySettingSidebarProps> = ({ onClickItem, handleMenu, currentSetting, category }) => {
	const [showModal, setShowModal] = useState(false);
	const { handleDeleteCategory } = useCategory();
	const currenChannel = useSelector(selectCurrentChannel);
	const handleClickButtonSidebar = (setting: ItemObjProps) => {
		onClickItem(setting);
	};
	const welcomeChannel = useSelector((state) => selectWelcomeChannelByClanId(state, category.clan_id as string));

	const openModalDeleteCategory = () => {
		if (hasWelcomeChannel) {
			toast.error('This category has welcome channel');
			return;
		}
		setShowModal(true);
	};

	const confirmDeleteCategory = async () => {
		handleDeleteCategory({ category, currenChannel: currenChannel as IChannel });
		setShowModal(false);
	};
	const hasWelcomeChannel = useMemo(() => {
		if (!category?.channels || !category?.channels?.length) {
			return false;
		}
		if (!welcomeChannel) {
			return false;
		}
		return (category.channels as string[]).includes(welcomeChannel);
	}, [category?.channels, welcomeChannel]);

	return (
		<div className="flex flex-row flex-1 justify-end">
			<div className="w-[220px] py-[60px] pl-5 pr-[6px]">
				<p className="text-[#84ADFF] pl-[10px] pb-[6px] font-bold text-sm tracking-wider uppercase truncate">{category.category_name}</p>
				{categorySettingList.map((settingItem) => (
					<SettingItem
						key={settingItem.id}
						name={settingItem.name}
						active={currentSetting.id === settingItem.id}
						onClick={() => handleClickButtonSidebar(settingItem)}
						handleMenu={handleMenu}
					/>
				))}
				<div className={'border-t-[0.08px] dark:border-borderDividerLight border-bgModifierHoverLight'}></div>
				<button
					className={`mt-[5px] text-red-500 w-full py-1 px-[10px] mb-1 text-[16px] font-medium rounded text-left dark:hover:bg-bgHover hover:bg-bgModifierHoverLight ${hasWelcomeChannel ? '!text-bgTertiary' : ''}`}
					onClick={openModalDeleteCategory}
				>
					Delete Category
				</button>
				{showModal && (
					<ModalConfirm
						handleCancel={() => setShowModal(false)}
						modalName={category?.category_name || ''}
						handleConfirm={confirmDeleteCategory}
						title="delete"
						buttonName="Delete category"
						message="This cannot be undone"
						customModalName="Category"
					/>
				)}
			</div>
		</div>
	);
};

export default CategorySettingSidebar;
