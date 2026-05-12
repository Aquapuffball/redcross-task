import { Heading, List, Paragraph } from "rk-designsystem";
import type { ComparisonDetailReady } from "../lib/utils/comparison-types";

type Props = {
  detail: ComparisonDetailReady;
};

export function RodeKorsActivitesList({ detail }: Props) {
  return (
    <section
      className="flex flex-col gap-3 my-4"
      aria-label="Røde Kors-aktiviteter i kommunen"
    >
      <Heading level={2} data-size="sm">
        Røde Kors-aktiviteter i kommunen
      </Heading>
      {detail.activities.length === 0 ? (
        <Paragraph data-size="sm">
          [ingen registrerte aktiviteter i våre data]
        </Paragraph>
      ) : (
        <List.Unordered>
          {detail.activities.map((name) => (
            <List.Item key={name}>{name}</List.Item>
          ))}
        </List.Unordered>
      )}
    </section>
  );
}
