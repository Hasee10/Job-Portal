// Deterministic, synthetic layout fixtures. No real people or company contacts.
export const DEMO_COUNT = 500;
const DAY = 86400000;
const PLACES = [
  ["Karachi", "Pakistan", "PAK", "PKR"], ["Lahore", "Pakistan", "PAK", "PKR"],
  ["Dubai", "United Arab Emirates", "ARE", "AED"], ["Riyadh", "Saudi Arabia", "SAU", "SAR"],
  ["London", "United Kingdom", "GBR", "GBP"], ["Berlin", "Germany", "DEU", "EUR"],
  ["Toronto", "Canada", "CAN", "CAD"], ["New York", "United States", "USA", "USD"],
  ["Singapore", "Singapore", "SGP", "SGD"], ["Sydney", "Australia", "AUS", "AUD"],
];
const ROLES = ["Frontend Engineer", "Backend Engineer", "Product Designer", "Data Analyst", "Project Manager", "Finance Analyst", "Supply Chain Specialist", "Marketing Manager", "Customer Success Specialist", "QA Engineer", "DevOps Engineer", "Procurement Officer", "UX Researcher", "Business Analyst", "Operations Coordinator", "Technical Writer", "Security Engineer", "Account Executive", "HR Specialist", "Machine Learning Engineer"];
const COMPANIES = ["Atlas", "Cedar", "Northstar", "Meridian", "Harbor", "Summit", "Nexus", "Bluebird", "Orchard", "Pioneer", "Vertex", "Evergreen", "Lighthouse", "Horizon", "Keystone", "Mosaic", "Nova", "Oak", "Prism", "River", "Solstice", "Terra", "Union", "Vista", "Willow"];
const LEVELS = ["EntryLevel", "Junior", "MidLevel", "Senior", "Lead", "Manager", "Director"];
const SECTORS = [["72", "IT services", "enterprise software and managed support"], ["79", "Business services", "professional consulting and administrative services"], ["45", "Construction", "building refurbishment and civil works"], ["71", "Engineering", "technical design and infrastructure supervision"], ["80", "Education", "staff training and learning platforms"], ["85", "Healthcare", "medical equipment and community health services"]];
export function demoId(kind, index) { return `d${kind}000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`; }
function anchor(now) { const day = new Date(now); day.setUTCHours(0,0,0,0); return day.getTime(); }
export function makeDemoJobs(now = Date.now()) {
  const today = anchor(now);
  return Array.from({length: DEMO_COUNT}, (_, i) => {
    const [city, country, , currency] = PLACES[i % PLACES.length];
    const title = ROLES[i % ROLES.length];
    const salary = currency === "PKR" ? 90000 + (i % 15) * 18000 : 45000 + (i % 15) * 6500;
    return {
      id: demoId("0", i), title, company: `Demo ${COMPANIES[Math.floor(i / ROLES.length)]} Group`,
      type: ["Full-time", "Part-time", "Contract", "Freelance"][i % 4],
      salary_min: i % 9 === 0 ? null : salary, salary_max: i % 9 === 0 ? null : Math.round(salary * 1.4), salary_currency: currency, salary_unit: currency === "PKR" ? "month" : "year",
      description: `## ${title}\n\n**Synthetic demo listing for layout testing. This is not a real vacancy.**\n\nJoin a collaborative team delivering useful products and services in ${city}. You will work with colleagues across engineering, operations and customer teams.\n\n### What you will do\n- Plan and deliver work in small, clear milestones.\n- Collaborate with stakeholders and share progress.\n- Improve quality, documentation and team practices.\n\n### What you bring\n- Relevant practical experience and clear communication.\n- Curiosity, ownership and a thoughtful approach to problem solving.\n\nThis description intentionally includes headings, lists and longer paragraphs for detail-page layout checks. No application can be submitted to this demo employer.`,
      benefits: "Flexible working; Learning budget; Health coverage; Paid leave",
      application_requirements: "A short introduction and an up-to-date resume.",
      apply_url: "", accepts_applications: false, employer_id: null,
      posted_at: new Date(today - (i % 28) * DAY - (i % 12) * 3600000).toISOString(),
      valid_through: new Date(today + (15 + i % 45) * DAY).toISOString(),
      source: "Demo data", job_identifier: `DEMO-JOB-${i+1}`, is_active: true,
      career_level: [LEVELS[i % LEVELS.length]], visa_sponsorship: i % 5 === 0 ? "Yes" : "No",
      featured: i % 11 === 0, remote_type: ["remote", "hybrid", "onsite"][i % 3],
      remote_region: i % 3 === 0 ? "Worldwide" : null,
      timezone_requirements: i % 3 === 0 ? "4 hours overlap with UTC+5" : null,
      workplace_city: city, workplace_country: country,
      languages: i % 5 === 0 ? ["en", "ur"] : i % 5 === 1 ? ["en", "ar"] : ["en"],
      skills: "Communication, planning, collaboration", qualifications: "Relevant experience or equivalent practical skills", education_requirements: "Degree or equivalent experience", experience_requirements: "2-5 years", industry: SECTORS[i % SECTORS.length][1], responsibilities: "Collaborate, deliver, document and improve.",
    };
  });
}
export function makeDemoTenders(now = Date.now()) {
  const today = anchor(now);
  return Array.from({length: DEMO_COUNT}, (_, i) => {
    const [city, , country] = PLACES[i % PLACES.length];
    const [cpv, category, scope] = SECTORS[i % SECTORS.length];
    return { id: demoId("1",i), source: country === "PAK" ? "ppra" : "ted", source_id: `joblo-demo-${i+1}`,
      title: `Demo ${category}: ${scope}${i % 7 === 0 ? " across multiple regional offices under a three-year framework agreement" : ""} - Lot ${String(i+1).padStart(3,"0")}`,
      buyer_name: `Demo ${city} ${["Municipal Authority", "University", "Infrastructure Agency", "Health Partnership"][i%4]}`,
      country, cpv_codes: [`${cpv}000000`, ...(i % 8 === 0 ? ["79000000"] : [])],
      publication_date: new Date(today - (i%35)*DAY).toISOString().slice(0,10),
      deadline_date: i%13 === 0 ? null : new Date(today + (1+i%60)*DAY).toISOString(),
      url: `https://example.invalid/demo/tenders/${i+1}`, is_active: true,
    };
  });
}
export function makeDemoOrganizations() {
  return Array.from({length: DEMO_COUNT}, (_,i) => {
    const [city,country] = PLACES[i%PLACES.length];
    const [,industry,services] = SECTORS[i%SECTORS.length];
    return { id: demoId("2",i), name: `Demo ${COMPANIES[i%COMPANIES.length]} ${industry} ${String(i+1).padStart(3,"0")}`,
      description: `Synthetic business profile for layout testing. Based in ${city}, this sample organization illustrates ${services}. ${i%4 === 0 ? "Our example team works across regions and supports longer-term projects with planning, delivery and aftercare. All details are fictional." : "All company information is fictional."}`,
      products_services: services, website: null, public_contact_email: null,
      industry, company_size: ["1-10", "11-50", "51-200", "201-500", "501-1000"][i%5],
      location: `${city}, ${country}`, categories: [industry], operating_regions: [country, ...(i%4 === 0 ? ["Global"] : [])],
      is_buyer: i%3 !== 1, is_supplier: i%3 !== 0, is_public: true,
    };
  });
}
