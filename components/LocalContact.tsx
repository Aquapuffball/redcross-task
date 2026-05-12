import { Alert, Card, CardBlock, Link, List, Paragraph } from "rk-designsystem";
import type {
  BranchContactPersonApi,
  OrganizationContactApiResponse,
} from "../lib/utils/comparison-types";

function formatBranchContactPersonName(
  c: BranchContactPersonApi,
): string | null {
  const parts = [c.firstName, c.lastName]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return parts.length > 0 ? parts.join(" ") : null;
}

type Props = {
  organizationContact: OrganizationContactApiResponse;
};

export function LocalContact({ organizationContact: oc }: Props) {
  const branch = oc.branch;
  if (!branch) {
    return (
      <section
        className="space-y-3"
        aria-label="Lokal Røde Kors-avdeling og kontakt"
      >
        <Alert
          data-color="neutral"
          data-size="sm"
          title="Ingen organisasjonsdata"
        >
          Vi fant ingen Røde Kors-avdeling knyttet til denne kommunen i våre
          data.
        </Alert>
      </section>
    );
  }

  const contacts = oc.contacts;
  const branchEmail = branch.email?.trim() || null;
  const phone = branch.phone?.trim() || null;
  const web = branch.web?.trim() || null;
  const anyPersonDetail = contacts.some(
    (c) =>
      formatBranchContactPersonName(c) || c.role?.trim() || c.email?.trim(),
  );

  return (
    <section className="my-4" aria-label="Lokal Røde Kors-avdeling og kontakt">
      <Card data-color="neutral">
        <CardBlock>
          <Paragraph>
            <strong>{branch.branchName}</strong>
            {branch.branchType ? (
              <span className="text-neutral-600"> ({branch.branchType})</span>
            ) : null}
          </Paragraph>
          {contacts.length > 0 ? (
            <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4">
              <p>
                {contacts.length === 1 ? "Kontaktperson" : "Kontaktpersoner"}
              </p>
              <List.Unordered className="list-disc">
                {contacts.map((c, i) => {
                  const name = formatBranchContactPersonName(c);
                  const role = c.role?.trim() || null;
                  const email = c.email?.trim() || null;
                  return (
                    <List.Item
                      key={`${i}-${email ?? ""}-${name ?? ""}-${role ?? ""}`}
                    >
                      {name}
                    </List.Item>
                  );
                })}
              </List.Unordered>
            </div>
          ) : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-1">
            {branchEmail ? (
              <div>
                <dt>
                  {contacts.length > 0 ? "E-post (avdeling):" : "E-post:"}
                </dt>
                <dd>
                  <Link href={`mailto:${branchEmail}`}>{branchEmail}</Link>
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt className="text-neutral-600">Telefon</dt>
                <dd className="mt-0.5">
                  <Link
                    className="text-sky-800 underline tabular-nums"
                    href={`tel:${phone.replace(/\s/g, "")}`}
                  >
                    {phone}
                  </Link>
                </dd>
              </div>
            ) : null}
            {web ? (
              <div>
                <dt className="text-neutral-600">Nettside</dt>
                <dd className="mt-0.5">
                  <a
                    className="break-all text-sky-800 underline"
                    href={
                      web.startsWith("http://") || web.startsWith("https://")
                        ? web
                        : `https://${web}`
                    }
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {web}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
          {!branchEmail && !phone && !web && !anyPersonDetail ? (
            <p className="mt-3 text-sm text-neutral-600">
              Ingen kontaktinformasjon registrert for denne avdelingen.
            </p>
          ) : null}
        </CardBlock>
      </Card>
    </section>
  );
}
