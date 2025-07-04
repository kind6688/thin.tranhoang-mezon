import { selectMemberClanByUserId } from '@mezon/store';
import { useSelector } from 'react-redux';

type Props = {
	readonly id: string;
	url?: string;
	name?: string;
};

export function NameComponent({ id, name }: Props) {
	const user = useSelector(selectMemberClanByUserId(id));
	return <p className="text-sm font-medium text-theme-primary">{name ? name : user?.user?.username}</p>;
}
