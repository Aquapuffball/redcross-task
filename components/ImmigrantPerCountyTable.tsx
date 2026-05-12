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
    <section
      className="flex flex-col gap-3 my-4"
      aria-label="Innvandringsstatistikk"
    >
      <Heading level={2} data-size="sm">
        Innvandring ({year})
      </Heading>
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
            <div className="overflow-x-auto min-w-0">
              <Table data-size="sm" border>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Kategori</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Antall</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Forklaring</Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  <Table.Row>
                    <Table.HeaderCell scope="row">
                      Totalt innvandrere
                    </Table.HeaderCell>
                    <Table.Cell>{fmt(totalInnvandrere)}</Table.Cell>
                    <Table.Cell>Personer, alle grunner</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.HeaderCell scope="row">
                      Flyktning og familie
                    </Table.HeaderCell>
                    <Table.Cell>{fmt(flyktningFamilie)}</Table.Cell>
                    <Table.Cell>Personer</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.HeaderCell scope="row">
                      Familieinnvandring
                    </Table.HeaderCell>
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
