import { Icons } from '@mezon/ui';

type SelectGroupProps = {
	groupName?: string;
	children?: React.ReactNode;
	isSearch?: boolean;
};

const SelectGroup = ({ groupName, children, isSearch }: SelectGroupProps) => {
	return (
		<div className="first:mt-0 mt-3 mx-3 border-b-theme-primary last:border-b-0 last:bottom-b-0 pb-3 last:pb-0">
			<div className="flex items-center justify-between pb-2">
				<h3 className="px-2 text-xs font-bold uppercase">{groupName}</h3>
				<div className="relative">
					<button title="Learn More">
						<Icons.Help defaultSize="w-4 h-4" />
					</button>
				</div>
			</div>
			{children}
		</div>
	);
};

export default SelectGroup;
