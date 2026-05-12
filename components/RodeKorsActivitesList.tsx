import { Heading, List, Paragraph } from "rk-designsystem";
import type { ComparisonDetailReady } from "../lib/utils/comparison-types";

type Props = {
  detail: ComparisonDetailReady;
};

export function RodeKorsActivitesList({ detail }: Props) {
  return (
    <section
      className="space-y-3 my-4"
      aria-label="Røde Kors-aktiviteter i kommunen"
    >
      <Heading level={2} data-size="sm">
        Røde Kors-aktiviteter i kommunen
      </Heading>
      {detail.activities.length === 0 ? (
        <p className="text-sm text-neutral-600">
          [ingen registrerte aktiviteter i våre data]
        </p>
      ) : (
        <List.Unordered className="list-disc my-4">
          {detail.activities.map((name) => (
            <List.Item key={name} className="mt-2">
              {name}
            </List.Item>
          ))}
        </List.Unordered>
      )}
    </section>
  );
}
