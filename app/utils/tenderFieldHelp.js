/** Help text for tender form fields (shown in field info popovers). */

export const TENDER_FIELD_HELP = {
  title: {
    title: 'Title',
    intro: 'The public name of this procurement. It should be short, specific, and easy for bidders and internal staff to recognise.',
  },
  description: {
    title: 'Description',
    intro: 'A summary of what you are buying, including scope, quantities, location, or special requirements. Bidders use this to decide whether to participate.',
  },
  projectname: {
    title: 'Project name',
    intro: 'Optional internal label (programme, project code, or cost centre) to link this tender to your organisation’s planning or reporting.',
  },
  user_requisition_date: {
    title: 'User requisition date',
    intro: 'The date the need was formally raised or approved internally. Useful for audit trails and planning timelines.',
  },
  priority: {
    title: 'Priority',
    intro: 'Optional planning signal for how urgently this procurement should be processed.',
    terms: [
      { label: 'Low', description: 'Routine need with flexible timing.' },
      { label: 'Medium', description: 'Standard priority within normal planning cycles.' },
      { label: 'High', description: 'Time-sensitive; should be progressed ahead of lower-priority work.' },
      { label: 'Critical', description: 'Urgent; requires immediate attention and fast tracking.' },
    ],
  },
  delivery: {
    title: 'Delivery expectations',
    intro: 'Optional notes on where, when, or how goods, works, or services should be delivered (site, region, phasing, or completion window).',
  },
  procurementgroup_id: {
    title: 'Procurement group',
    intro: 'Classifies the type of procurement (e.g. goods, works, services). Determines which evaluation methods and rules apply to this tender.',
  },
  procurementmethod_id: {
    title: 'Procurement method',
    intro: 'The legal or procedural route for this tender (e.g. open tender, RFQ). Controls whether bid bonds are allowed and other process rules.',
  },
  expensecategory: {
    title: 'Expense category',
    intro: 'How the spend is classified for budgeting and reporting.',
    terms: [
      { label: 'CapEx', description: 'Capital expenditure — assets or investments with long-term value.' },
      { label: 'MOOE', description: 'Maintenance and operating expenses — recurring operational costs.' },
    ],
  },
  bidopeningtype_id: {
    title: 'Bid opening type',
    intro: 'How and when bids will be opened (e.g. single-stage, two-envelope). Choose the option configured for your organisation’s process.',
  },
  contracttype: {
    title: 'Contract type',
    intro: 'The form of contract bidders are competing for.',
    terms: [
      { label: 'AWARD', description: 'A single contract is awarded from this tender.' },
      { label: 'FRAMEWORK', description: 'Establishes a framework agreement; call-offs or awards may follow later.' },
    ],
  },
  tendernumber: {
    title: 'Tender number',
    intro: 'Your reference number for this tender. Leave blank to auto-generate a unique number for the current year.',
  },
  bidSecurity: {
    title: 'Bid security',
    intro: 'Bid bond and validity settings apply only when the selected procurement method allows bid bonds. If you require a bond, bidders must submit security and you must specify how long bids remain valid.',
  },
  required_bid_bond: {
    title: 'Require bid bond?',
    intro: 'Only available when the selected procurement method supports bid bonds. Indicates whether bidders must submit bid security.',
    terms: [
      { label: 'Yes', description: 'Bidders must provide a bid bond; you must also set a bid validity period.' },
      { label: 'No', description: 'No bid bond is required for this tender.' },
    ],
  },
  bid_validity_period: {
    title: 'Bid validity period',
    intro: 'How long submitted bids remain binding after the closing date, in days. Required when a bid bond is required.',
    terms: [
      { label: '30 / 60 / 90 / 120 days', description: 'Standard validity windows. Choose the period that matches your procurement rules and evaluation timeline.' },
    ],
  },
  allowed_participants: {
    title: 'Allowed participants',
    intro: 'Which suppliers may bid based on registration or origin rules.',
    terms: [
      { label: 'Domestic', description: 'Only locally registered or domestic suppliers may participate.' },
      { label: 'International', description: 'Foreign and domestic suppliers may participate, subject to your rules.' },
    ],
  },
  lotType: {
    title: 'LOT type',
    intro: 'How items are taken from your Annual Procurement Plan (APP) when building this tender.',
    terms: [
      {
        label: 'SINGLE',
        description: 'Select one item from the Annual Procurement Plan (APP). That item becomes the lot for this tender.',
      },
      {
        label: 'MULTIPLE',
        description: 'Select multiple items from the APP. Each selected item represents a separate lot.',
      },
    ],
  },
  responseMode: {
    title: 'Response mode',
    intro: 'How many lots a single bidder may submit a response for.',
    terms: [
      { label: 'SINGLE', description: 'A bidder may respond to only one lot.' },
      { label: 'MULTIPLE', description: 'A bidder may respond to more than one lot.' },
    ],
  },
  responseRules: {
    title: 'Response rules',
    intro: 'Whether bidders must quote on every line item within the lots they bid on.',
    terms: [
      {
        label: 'ALL ITEMS',
        description: 'The bidder must quote on every item within each lot they choose to bid on.',
      },
      {
        label: 'SELECTED',
        description: 'The bidder may quote only on the items they choose within each lot.',
      },
    ],
  },
  evaluationcriterion_id: {
    title: 'Evaluation method',
    intro: 'How bids will be evaluated (e.g. lowest price, quality-based). Only methods linked to your selected procurement group are listed.',
  },
}
