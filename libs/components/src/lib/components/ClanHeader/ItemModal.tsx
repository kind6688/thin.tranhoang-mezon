import { ReactNode } from 'react';

type ItemModalProps = {
	children: string;
	endIcon?: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
};

const ItemModal = ({ children, endIcon, onClick, disabled }: ItemModalProps) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className="flex items-center w-full justify-between rounded-sm hover:bg-bgSelectItem group pr-2"
		>
			<li className="text-[14px] dark:text-[#B5BAC1] text-colorTextLightMode group-hover:text-white font-medium w-full py-[6px] px-[8px] text-left cursor-pointer list-none ">
				{children}
			</li>
			{endIcon && <div className="flex items-center justify-center h-[18px] w-[18px]">{endIcon}</div>}
		</button>
	);
};

export default ItemModal;
