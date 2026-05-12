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
        className="my-4"
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
  const webHref =
    web && (web.startsWith("http://") || web.startsWith("https://"))
      ? web
      : web
        ? `https://${web}`
        : null;

  return (
    <section className="my-4" aria-label="Lokal Røde Kors-avdeling og kontakt">
      <Card data-color="neutral">
        <CardBlock>
          <Paragraph>
            <strong>{branch.branchName}</strong>
            {branch.branchType ? (
              <span className="text-ds-text-subtle">
                {" "}
                ({branch.branchType})
              </span>
            ) : null}
          </Paragraph>

          {contacts.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4 border-t border-ds-border-default pt-4">
              <Paragraph data-size="md">
                {contacts.length === 1 ? "Kontaktperson:" : "Kontaktpersoner:"}
              </Paragraph>
              <List.Unordered>
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

          <dl className="mt-4 grid grid-cols-1 gap-3">
            {branchEmail ? (
              <div>
                <dt className="text-ds-text-subtle font-semibold">
                  {contacts.length > 0 ? "E-post (avdeling):" : "E-post:"}
                </dt>
                <dd className="mt-1">
                  <Link href={`mailto:${branchEmail}`}>{branchEmail}</Link>
                </dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt className="text-ds-text-subtle font-semibold">Telefon:</dt>
                <dd className="mt-1">
                  <Link href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</Link>
                </dd>
              </div>
            ) : null}
            {webHref ? (
              <div>
                <dt className="text-ds-text-subtle">Nettside</dt>
                <dd className="mt-1 break-all">
                  <Link
                    href={webHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {web}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {!branchEmail && !phone && !web && !anyPersonDetail ? (
            <Paragraph data-size="sm">
              Ingen kontaktinformasjon registrert for denne avdelingen.
            </Paragraph>
          ) : null}
        </CardBlock>
      </Card>
    </section>
  );
}
