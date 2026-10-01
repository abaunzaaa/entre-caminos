import { UnderConstruction } from "../components/explorer/UnderConstruction";

type ExplorerBlankPageProps = {
  title: string;
};

export function ExplorerBlankPage({ title }: ExplorerBlankPageProps) {
  return (
    <main className="explorer-blank">
      <UnderConstruction title={title} />
    </main>
  );
}
