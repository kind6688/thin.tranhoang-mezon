type ItemPanelMemberProps = {
	children: string;
	danger?: boolean;
	onClick?: (e: any) => void;
};

const ItemPanelMember = ({ children, danger, onClick }: ItemPanelMemberProps) => {
	return (
		<button onClick={onClick} className="flex items-center w-full justify-between rounded-sm hover:bg-bgSelectItem hover:[&>*]:text-[#fff] pr-2">
			<li
				className={`text-[14px] ${danger ? 'text-colorDanger' : 'dark:text-[#B5BAC1] text-textSecondary800'} font-medium w-full py-[6px] px-[8px] text-left cursor-pointer list-none`}
			>
				{children}
			</li>
		</button>
	);
};

export default ItemPanelMember;
