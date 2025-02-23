import { ClientPage } from "./client-page";

export type paramsType = Promise<{ id: string }>;

type Props = {
  params: paramsType;
};

const Page = async ({ params }: Props) => {
  const { id } = await params;
  return <ClientPage id={id} />;
};

export default Page;