"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Card,
  CardBlock,
  Field,
  Heading,
  Paragraph,
  Select,
  Spinner,
} from "rk-designsystem";
import { Label } from "@digdir/designsystemet-react";
import {
  ComparisonDetailError,
  ComparisonDetailLoading,
} from "../../components/comparison-detail-status";
import type {
  ActivitiesApiResponse,
  ComparisonDetailReady,
  MunicipalityOption,
  OrganizationContactApiResponse,
} from "../../lib/utils/comparison-types";
import { ImmigrantPerCountyTable } from "../../components/ImmigrantPerCountyTable";
import { summaryText } from "../../lib/utils/comparison-helpers";
import { LocalContact } from "../../components/LocalContact";
import { RodeKorsActivitesList } from "../../components/RodeKorsActivitesList";

export type { MunicipalityOption } from "../../lib/utils/comparison-types";

const COMPARISON_YEARS = [2025, 2024, 2023] as const;
const COMPARISON_YEAR_RANGE_LABEL = `${Math.min(...COMPARISON_YEARS)}–${Math.max(...COMPARISON_YEARS)}`;

type KommunerFetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; municipalities: MunicipalityOption[] };

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready" } & ComparisonDetailReady);

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  const body: unknown = await res.json();
  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Feil ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export default function Home() {
  const [state, setState] = useState<KommunerFetchState>({ status: "loading" });
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(COMPARISON_YEARS[0]);
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const body = await fetchJson<unknown[]>("/api/kommuner", ac.signal);
        const municipalities: MunicipalityOption[] = body.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            id: String(r.id),
            code: String(r.code),
            name: String(r.name),
            county: r.county == null ? null : String(r.county),
          };
        });
        setState({ status: "ready", municipalities });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        const message =
          e instanceof Error ? e.message : "Kunne ikke hente kommuner.";
        setState({ status: "error", message });
      }
    })();

    return () => ac.abort();
  }, []);

  const loadDetail = useCallback(
    async (municipalityId: string, year: number, signal: AbortSignal) => {
      setDetail({ status: "loading" });
      try {
        const q = new URLSearchParams({
          municipality: municipalityId,
          year: String(year),
        });
        const qs = q.toString();
        const qPrev = new URLSearchParams({
          municipality: municipalityId,
          year: String(year - 1),
        });
        const activitiesUrl = `/api/organisasjon/aktiviteter?municipality=${encodeURIComponent(municipalityId)}`;
        const orgContactUrl = `/api/organisasjon/lokal-kontakt?municipality=${encodeURIComponent(municipalityId)}`;
        const [
          immigration,
          immigrationPreviousYear,
          leisure,
          activitiesPayload,
          organizationContact,
        ] = await Promise.all([
          fetchJson<ComparisonDetailReady["immigration"]>(
            `/api/immigrering?${qs}`,
            signal,
          ),
          fetchJson<ComparisonDetailReady["immigration"]>(
            `/api/immigrering?${qPrev.toString()}`,
            signal,
          ),
          fetchJson<ComparisonDetailReady["leisure"]>(
            `/api/fritidssentere?${qs}`,
            signal,
          ),
          fetchJson<ActivitiesApiResponse>(activitiesUrl, signal),
          fetchJson<OrganizationContactApiResponse>(orgContactUrl, signal),
        ]);
        const activities = Array.isArray(activitiesPayload.activities)
          ? activitiesPayload.activities
          : [];
        setDetail({
          status: "ready",
          immigration,
          immigrationPreviousYear,
          leisure,
          activities,
          organizationContact,
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        const message =
          e instanceof Error ? e.message : "Kunne ikke hente kommunedata.";
        setDetail({ status: "error", message });
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedMunicipalityId) {
      setDetail({ status: "idle" });
      return;
    }
    const ac = new AbortController();
    void loadDetail(selectedMunicipalityId, selectedYear, ac.signal);
    return () => ac.abort();
  }, [selectedMunicipalityId, selectedYear, loadDetail]);

  const selectedKommune =
    state.status === "ready"
      ? state.municipalities.find((m) => m.id === selectedMunicipalityId)
      : undefined;

  const mainBody = (() => {
    if (state.status === "loading") {
      return (
        <div className="flex items-center justify-center gap-3 py-12">
          <Spinner data-size="md" aria-hidden />
          <Paragraph data-size="sm">Henter kommuner …</Paragraph>
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <Alert data-color="danger" data-size="sm" title="Noe gikk galt">
          {state.message}
        </Alert>
      );
    }

    const { municipalities } = state;

    if (municipalities.length === 0) {
      return (
        <Alert data-color="info" data-size="sm" title="Ingen kommuner funnet">
          Finner ingen kommuner, har du importert data? Se README.md for
          instruksjoner.
        </Alert>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <Card data-color="neutral">
          <CardBlock>
            <div className="flex flex-wrap gap-6 max-w-lg">
              <div className="flex-1 min-w-0 basis-40">
                <Field>
                  <Label htmlFor="municipality-select">Kommune</Label>
                  <Select
                    id="municipality-select"
                    name="municipalityId"
                    aria-label="Velg kommune"
                    data-size="md"
                    value={selectedMunicipalityId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setSelectedMunicipalityId(e.target.value)
                    }
                  >
                    <Select.Option value="">Velg kommune …</Select.Option>
                    {municipalities.map((m) => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex-1 min-w-0 basis-32">
                <Field>
                  <Label htmlFor="year-select">År</Label>
                  <Select
                    id="year-select"
                    name="year"
                    aria-label="Velg år"
                    data-size="md"
                    value={String(selectedYear)}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setSelectedYear(Number.parseInt(e.target.value, 10))
                    }
                  >
                    {COMPARISON_YEARS.map((y) => (
                      <Select.Option key={y} value={String(y)}>
                        {y}
                      </Select.Option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </CardBlock>
        </Card>

        {selectedMunicipalityId ? (
          <div className="flex flex-col gap-8">
            {detail.status === "loading" ? <ComparisonDetailLoading /> : null}
            {detail.status === "error" ? (
              <ComparisonDetailError message={detail.message} />
            ) : null}
            {detail.status === "ready" && selectedKommune ? (
              <div className="flex flex-col md:flex-row gap-8">
                <div className="order-2 md:order-1 w-full">
                  <ImmigrantPerCountyTable
                    year={selectedYear}
                    immigration={detail.immigration}
                  />
                  <LocalContact
                    organizationContact={detail.organizationContact}
                  />
                </div>
                <div className="order-1 md:order-2 w-full">
                  <div className="flex flex-col gap-4 my-4">
                    <Paragraph data-size="md">
                      Viser data for{" "}
                      <strong>
                        {selectedKommune.name} ({selectedKommune.code}
                        {selectedKommune.county
                          ? `, ${selectedKommune.county}`
                          : ""}
                        )
                      </strong>{" "}
                      for år <strong>{selectedYear}</strong>.
                    </Paragraph>
                    <Paragraph data-size="md">
                      {summaryText(
                        selectedYear,
                        detail.immigration,
                        detail.immigrationPreviousYear,
                        detail.leisure,
                      )}
                    </Paragraph>
                  </div>

                  <RodeKorsActivitesList detail={detail} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6"
    >
      <Heading level={1} data-size="md">
        Kommunesammenligning
      </Heading>
      <Paragraph data-size="md">
        Velg kommune og år ({COMPARISON_YEAR_RANGE_LABEL}) for å se
        innvandringsstatistikk og fritidsklubb-data (SSB 12063).
      </Paragraph>

      {mainBody}
    </main>
  );
}
