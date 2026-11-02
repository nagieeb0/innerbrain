/** Validates and normalises a demo-request form submission from the landing page. */

export type Lead = {
  name: string;
  company: string;
  phone: string;
  email: string;
  team_size: string;
  city: string;
  need: string;
};

const TEAM_SIZES = ["1-10", "11-15", "16-40", "41-100", "100+"];

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Returns a clean Lead, or an Arabic error message the form can show as-is. Honeypot hits return "spam". */
export function parseLead(body: Record<string, unknown>): Lead | { error: string } {
  if (clean(body.website, 200)) return { error: "spam" };
  // Arabic-Indic digits → ASCII, then keep + and digits only.
  const phone = clean(body.phone, 30)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\d+]/g, "");
  const lead: Lead = {
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    phone,
    email: clean(body.email, 160).toLowerCase(),
    team_size: TEAM_SIZES.includes(clean(body.team_size, 10)) ? clean(body.team_size, 10) : "",
    city: clean(body.city, 80),
    need: typeof body.need === "string" ? body.need.trim().slice(0, 1500) : "",
  };
  if (lead.name.length < 2) return { error: "اكتب اسمك من فضلك." };
  if (lead.company.length < 2) return { error: "اكتب اسم الشركة من فضلك." };
  if (!/^\+?\d{8,15}$/.test(lead.phone)) return { error: "رقم الجوال غير صحيح." };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: "البريد الإلكتروني غير صحيح." };
  return lead;
}
