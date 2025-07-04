import { ModalLayout } from '../../components';

type ModalValidateFileProps = {
	title?: string;
	content?: string;
	image?: string;
	onClose: () => void;
};

const ModalValidateFile = ({ title, content, image, onClose }: ModalValidateFileProps) => {
	return (
		<ModalLayout onClose={onClose} className="bg-[#111111] text-contentPrimary bg-opacity-90 focus-visible:[&>*]:outline-none">
			<div className="bg-red-500 rounded-lg overflow-hidden">
				<div className="space-y-6 h-52 border-dashed border-2 flex text-center justify-center flex-col">
					<img className="w-60 h-60 absolute top-[-130px] left-1/2 translate-x-[-50%]" src={image} alt="file" />
					<h3 className="text-white text-4xl font-semibold">{title}</h3>
					<h4 className="text-white text-xl">{content}</h4>
				</div>
			</div>
		</ModalLayout>
	);
};

export default ModalValidateFile;
