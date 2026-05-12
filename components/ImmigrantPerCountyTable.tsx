import { Alert, Heading, Table } from "rk-designsystem";
import { ImmigrationReason } from "@/app/generated/prisma/enums";
import { immigrationPersonsAlle } from "../lib/utils/comparison-helpers";
import type { ImmigrationApiRow } from "../lib/utils/comparison-types";

type Props = {
  year: number;
  immigration: ImmigrationApiRow[];
};

export function ImmigrantPerCountyTable({ year, immigration }: Props) {
  return (
    <section className="my-4" aria-label="Innvandringsstatistikk">
      {immigration.length === 0 ? (
        <Alert data-color="neutral" data-size="sm" title="Ingen rader">
          Ingen innvandringsstatistikk for {year} og denne kommunen.
        </Alert>
      ) : (
        (() => {
          const rows = immigration;
          const totalInnvandrere = immigrationPersonsAlle(
            rows,
            ImmigrationReason.ALL,
          );
          const flyktningFamilie = immigrationPersonsAlle(
            rows,
            ImmigrationReason.REFUGEES_AND_FAMILY,
          );
          const familie = immigrationPersonsAlle(
            rows,
            ImmigrationReason.FAMILY,
          );
          const missingAll =
            totalInnvandrere == null &&
            flyktningFamilie == null &&
            familie == null;

          if (missingAll) {
            return (
              <Alert
                data-color="neutral"
                data-size="sm"
                title="Ingen sammendrag tilgjengelig"
              >
                Fant ikke person-tall med kjønnsaggregat «alle» for
                hovedkategoriene for {year}.
              </Alert>
            );
          }

          const fmt = (v: string | null) => (v !== null ? v : "—");

          return (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <Table data-size="sm" className="min-w-[18rem]">
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Kategori</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Antall</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Forklaring</Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell className="font-medium">
                      Totalt innvandrere
                    </Table.Cell>
                    <Table.Cell>{fmt(totalInnvandrere)}</Table.Cell>
                    <Table.Cell>Personer, alle grunner</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium">
                      Flyktning og familie
                    </Table.Cell>
                    <Table.Cell>{fmt(flyktningFamilie)}</Table.Cell>
                    <Table.Cell>Personer</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium">
                      Familieinnvandring
                    </Table.Cell>
                    <Table.Cell>{fmt(familie)}</Table.Cell>
                    <Table.Cell>Personer</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </div>
          );
        })()
      )}
    </section>
  );
}
