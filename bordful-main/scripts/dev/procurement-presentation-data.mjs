import { createHash } from "node:crypto";

export const PRESENTATION_EMAIL = "ihaseebarshad10@gmail.com";
export function presentationId(label) {
  const hex = createHash("sha256")
    .update(`procurement-presentation:${PRESENTATION_EMAIL}:${label}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function makeProcurementPresentation(now = Date.now()) {
  const id = presentationId;
  const date = (days) => new Date(now + days * 86_400_000).toISOString();
  const ownerId = id("account");
  const organizations = [];
  const members = [];
  const connections = [];
  const messages = [];
  const requests = [];
  const invitations = [];
  const responses = [];
  const evaluations = [];
  const audit = [];
  const awards = [];
  const teamInvitations = [];
  const ownedNames = [
    "IntegCubes — Presentation",
    "IntegCubes Technology — Presentation",
    "IntegCubes Supply & Logistics — Presentation",
    "IntegCubes Facilities — Presentation",
  ];
  const sectors = [
    [
      "IT & Technology",
      "Business laptops and workstations",
      "120 laptops, 30 developer workstations, setup and a three-year onsite warranty",
      18_500_000,
    ],
    [
      "Office furniture",
      "Ergonomic office refurbishment",
      "80 sit-stand desks, 120 ergonomic chairs and phased installation",
      6_800_000,
    ],
    [
      "Energy",
      "Commercial solar installation",
      "100 kW rooftop solar system with monitoring, commissioning and maintenance",
      12_500_000,
    ],
    [
      "Logistics",
      "Nationwide distribution services",
      "Scheduled deliveries between Karachi, Lahore and Islamabad with shipment tracking",
      4_200_000,
    ],
    [
      "Software",
      "ERP implementation and support",
      "Finance, inventory and procurement modules with migration and staff training",
      9_500_000,
    ],
    [
      "Facilities",
      "Annual facilities maintenance",
      "Preventive HVAC, electrical and safety inspections across four offices",
      3_600_000,
    ],
    [
      "Telecommunications",
      "Enterprise network upgrade",
      "Managed switches, Wi-Fi 6 access points, firewall and network monitoring",
      5_400_000,
    ],
    [
      "Professional services",
      "Security and compliance assessment",
      "Information security audit, remediation roadmap and policy workshops",
      2_800_000,
    ],
    [
      "Industrial supplies",
      "Warehouse equipment and safety kits",
      "Pallet racks, handling equipment and personal protective equipment",
      7_200_000,
    ],
    [
      "Marketing",
      "Brand and launch campaign",
      "Research, creative production and a twelve-week digital campaign",
      2_400_000,
    ],
    [
      "Training",
      "Leadership and technical training",
      "Eight workshops, assessments and an employee learning portal",
      1_800_000,
    ],
    [
      "Construction",
      "Regional office fit-out",
      "Interior works, meeting rooms, cabling and accessibility improvements",
      16_800_000,
    ],
  ];
  const partnerNames = [
    "Atlas",
    "Cedar",
    "Northstar",
    "Meridian",
    "Harbor",
    "Summit",
    "Nexus",
    "Pioneer",
    "Vertex",
    "Evergreen",
    "Horizon",
    "Keystone",
    "Mosaic",
    "Nova",
    "Prism",
    "River",
    "Solstice",
    "Terra",
    "Vista",
    "Willow",
    "Orchard",
    "Bluebird",
    "Lighthouse",
    "Oak",
    "Falcon",
    "Crescent",
    "Indus",
    "Sapphire",
    "Sterling",
    "Frontier",
    "Apex",
    "Zenith",
  ];
  for (let i = 0; i < 36; i++) {
    const own = i < 4;
    const sector = sectors[(own ? i : i - 4) % sectors.length];
    const orgId = id(`org-${i}`);
    organizations.push({
      categories: [sector[0]],
      company_size: ["51-200", "11-50", "201-500"][i % 3],
      created_at: date(-90),
      description: `Fictional presentation business based in ${["Karachi", "Lahore", "Islamabad", "Faisalabad"][i % 4]}. We deliver ${sector[2]}. Our team supports discovery, planning, delivery and ongoing support. All figures and business activity are synthetic.`,
      id: orgId,
      industry: sector[0],
      is_buyer: true,
      is_public: false,
      is_supplier: true,
      location: [
        "Karachi, Pakistan",
        "Lahore, Pakistan",
        "Islamabad, Pakistan",
      ][i % 3],
      name: own ? ownedNames[i] : `Demo ${partnerNames[i - 4]} ${sector[0]}`,
      operating_regions: ["Pakistan", "United Arab Emirates"],
      products_services: sector[2],
      public_contact_email: null,
      updated_at: date(-i % 14),
      website: null,
    });
    members.push({
      created_at: date(-90),
      id: id(`member-${i}`),
      member_id: own ? ownerId : id(`partner-owner-${i}`),
      member_type: "employer",
      organization_id: orgId,
      role: "owner",
    });
    if (own) {
      for (let j = 0; j < 3; j++) {
        teamInvitations.push({
          created_at: date(-j - 1),
          expires_at: date(30),
          id: id(`team-invite-${i}-${j}`),
          invited_by_id: ownerId,
          invited_by_type: "employer",
          invited_email: `${["operations", "finance", "sourcing"][j]}@presentation.example.invalid`,
          organization_id: orgId,
          role: j === 0 ? "admin" : "member",
          status: "pending",
          token_hash: createHash("sha256")
            .update(id(`team-token-${i}-${j}`))
            .digest("hex"),
        });
      }
    }
  }
  // Both trading directions exist so buyer and supplier workflows can be shown.
  for (let a = 0; a < 4; a++) {
    for (let p = 4; p < 36; p++) {
      for (let direction = 0; direction < 2; direction++) {
        const own = organizations[a].id;
        const partner = organizations[p].id;
        const label = `connection-${a}-${p}-${direction}`;
        const status = p < 28 ? "accepted" : p < 34 ? "pending" : "rejected";
        const incoming = p % 2 === 0;
        connections.push({
          buyer_org_id: direction === 0 ? own : partner,
          created_at: date(-30 + p / 10),
          id: id(label),
          message: `Demo partnership request: let us discuss upcoming ${sectors[(p - 4) % 12][0].toLowerCase()} requirements and delivery schedules.`,
          recipient_org_id: incoming ? own : partner,
          requested_by_id: incoming ? id(`partner-owner-${p}`) : ownerId,
          requested_by_type: "employer",
          requester_org_id: incoming ? partner : own,
          responded_at: status === "pending" ? null : date(-25),
          responded_by_id:
            status === "pending"
              ? null
              : incoming
                ? ownerId
                : id(`partner-owner-${p}`),
          responded_by_type: status === "pending" ? null : "employer",
          status,
          supplier_org_id: direction === 0 ? partner : own,
        });
        if (status === "accepted" && direction === 0) {
          const conversation = [
            "Thank you for connecting. We are preparing next quarter’s sourcing plan.",
            "Happy to help. We can share specifications, lead times and indicative pricing.",
            "Please include warranty coverage, delivery milestones and payment terms.",
            "Our proposal includes installation, a dedicated account manager and 30-day payment terms.",
            "The team has reviewed the initial scope. Can you confirm availability for a kickoff next week?",
            "Confirmed. We have reserved capacity and will send the project schedule for review.",
          ];
          conversation.forEach((body, m) =>
            messages.push({
              body,
              connection_id: id(label),
              created_at: date(-5 + m * 0.1 + p * 0.01),
              id: id(`${label}-message-${m}`),
              sender_member_id:
                m % 2 === 0 ? ownerId : id(`partner-owner-${p}`),
              sender_member_type: "employer",
              sender_org_id: m % 2 === 0 ? own : partner,
            })
          );
        }
      }
    }
  }
  const statuses = [
    "published",
    "published",
    "published",
    "draft",
    "evaluating",
    "awarded",
    "closed_for_responses",
    "bids_opened",
    "cancelled",
  ];
  for (let n = 0; n < 144; n++) {
    const sector = sectors[n % 12];
    const orgIndex = n % 4;
    const incoming = n >= 96;
    const partnerIndex = 4 + (n % 24);
    const buyer = organizations[incoming ? partnerIndex : orgIndex];
    const status = statuses[Math.floor(n / 4) % statuses.length];
    const requestId = id(`request-${n}`);
    const sealed = status === "bids_opened" || n % 5 === 0;
    const closed = [
      "closed_for_responses",
      "bids_opened",
      "evaluating",
      "awarded",
      "cancelled",
    ].includes(status);
    requests.push({
      awarded_at: status === "awarded" ? date(-1) : null,
      buyer_id: null,
      buyer_org_id: buyer.id,
      category: sector[0],
      created_at: date(-45 + n / 10),
      description: `PRESENTATION DATA — fictional procurement exercise.\n\nScope\n${sector[2]}. This procurement supports our regional growth and service quality programme.\n\nDelivery requirements\nProvide an itemised proposal with implementation milestones, quality assurance, warranty, support arrangements and references. Delivery locations: Karachi, Lahore and Islamabad.\n\nCommercial terms\nIndicative budget: PKR ${sector[3].toLocaleString("en-PK")}. Payment: 30% mobilisation, 50% on delivery and 20% on acceptance. Prices should include taxes and delivery.\n\nEvaluation\nTechnical compliance 40%; total cost 35%; delivery timeline 15%; service coverage 10%.`,
      id: requestId,
      published_at: status === "draft" ? null : date(-30),
      requires_prequalification: false,
      response_deadline: date(closed ? -3 - (n % 8) : 7 + (n % 30)),
      sealed_bids: sealed,
      spec_fields: [
        { field_type: "text", label: "Quantity / scope", value: sector[2] },
        {
          field_type: "text",
          label: "Delivery location",
          value: "Karachi, Lahore and Islamabad",
        },
        {
          field_type: "text",
          label: "Estimated budget",
          value: `PKR ${sector[3].toLocaleString("en-PK")}`,
        },
        { field_type: "text", label: "Warranty", value: "Minimum 12 months" },
      ],
      status,
      title: `${sector[1]} — ${incoming ? "Partner opportunity" : "Procurement"} ${String(n + 1).padStart(3, "0")}`,
      type: ["rfq", "rfp", "rfi", "tender"][Math.floor(n / 4) % 4],
      updated_at: date(-n % 7),
      visibility: "invite_only",
    });
    if (status === "draft") {
      continue;
    }
    const suppliers = incoming
      ? [orgIndex]
      : [4 + (n % 24), 4 + ((n + 5) % 24), 4 + ((n + 11) % 24)];
    let winner = null;
    for (let s = 0; s < suppliers.length; s++) {
      const supplierIndex = suppliers[s];
      const supplier = organizations[supplierIndex];
      const invitationId = id(`invitation-${n}-${s}`);
      const responded =
        status !== "cancelled" &&
        (status !== "published" || n % 3 !== 0 || s === 0) &&
        !(incoming && status === "published" && n % 2 === 0);
      invitations.push({
        id: invitationId,
        invited_at: date(-20),
        request_id: requestId,
        responded_at: responded ? date(-10) : null,
        status: responded ? "responded" : n % 2 === 0 ? "invited" : "viewed",
        supplier_org_id: supplier.id,
        vendor_id: null,
      });
      if (!responded) {
        continue;
      }
      const responseId = id(`response-${n}-${s}`);
      winner ??= responseId;
      responses.push({
        id: responseId,
        invitation_id: invitationId,
        is_withdrawn: n % 17 === 0 && s === 2,
        pricing: {
          amount: String(
            Math.round(sector[3] * (0.84 + s * 0.08 + (n % 5) * 0.01))
          ),
          currency: "PKR",
        },
        proposal_text: `Fictional proposal from ${supplier.name}.\n\nWe will deliver ${sector[2]}. Our offer includes a dedicated project manager, installation and acceptance testing, a 12-month warranty, staff training and quarterly service reviews.\n\nTimeline: discovery in week 1, procurement and preparation in weeks 2–3, delivery in weeks 4–6. We provide weekly progress reports and escalation support.\n\nPayment terms: 30% mobilisation, 50% delivery, 20% acceptance. Pricing includes local delivery and applicable taxes. Offer valid for 45 days.`,
        request_id: requestId,
        submitted_at: date(-10 + s * 0.1),
        supplier_org_id: supplier.id,
        vendor_id: null,
      });
      if (["evaluating", "awarded"].includes(status)) {
        evaluations.push({
          created_at: date(-2),
          evaluator_id: incoming
            ? id(`partner-owner-${partnerIndex}`)
            : ownerId,
          id: id(`evaluation-${n}-${s}`),
          notes: [
            "Strong technical compliance, competitive total cost and clear implementation plan.",
            "Good service coverage; clarify delivery dependencies before final selection.",
            "Acceptable proposal; price and support terms require negotiation.",
          ][s],
          request_id: requestId,
          response_id: responseId,
          score: 94 - s * 7 - (n % 4),
        });
      }
    }
    if (status === "awarded" && winner) {
      awards.push({ awarded_response_id: winner, id: requestId });
    }
    const actions = [
      "created",
      "published",
      ...(["evaluating", "awarded"].includes(status)
        ? ["evaluation_started", "response_scored"]
        : []),
      ...(status === "awarded" ? ["awarded"] : []),
    ];
    actions.forEach((action, index) =>
      audit.push({
        action,
        actor_id: incoming ? id(`partner-owner-${partnerIndex}`) : ownerId,
        actor_role: "employer",
        id: id(`audit-${n}-${index}`),
        metadata: {
          presentation: true,
          ...(action === "awarded" ? { response_id: winner } : {}),
        },
        occurred_at: date(-30 + index * 5),
        request_id: requestId,
      })
    );
  }
  return {
    audit,
    awards,
    connections,
    evaluations,
    invitations,
    members,
    messages,
    organizations,
    ownerId,
    requests,
    responses,
    teamInvitations,
  };
}
