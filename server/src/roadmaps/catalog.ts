import type { SubmissionRequirements } from "../submissions/types.js";
import type { CanonicalCheckpoint, CanonicalRoadmapPlan, RoadmapResource } from "./types.js";

type RoadmapProjectInput = {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  estimatedHours: string | null;
  deliverable: string | null;
  skills: string | null;
  skillTags: string | null;
};

type Recipe = {
  scopeTitle: string;
  scopeObjective: string;
  buildTitle: string;
  buildObjective: string;
  validationTitle: string;
  validationObjective: string;
  buildVerb: string;
  validationMethod: string;
  resources: RoadmapResource[];
};

type ProjectGuidance = {
  scopeActions?: string[];
  scopeDone?: string[];
  setupActions?: string[];
  setupDone?: string[];
  buildActions?: string[];
  buildDone?: string[];
  validationActions?: string[];
  validationDone?: string[];
  packageActions?: string[];
  packageDone?: string[];
};

const RESOURCES = {
  github: { label: "GitHub documentation", url: "https://docs.github.com/" },
  mdn: { label: "MDN Web Docs", url: "https://developer.mozilla.org/" },
  python: { label: "Python documentation", url: "https://docs.python.org/3/" },
  pythonArgparse: { label: "Python argparse documentation", url: "https://docs.python.org/3/library/argparse.html" },
  pythonUrllib: { label: "Python urllib.request documentation", url: "https://docs.python.org/3/library/urllib.request.html" },
  mbtaApi: { label: "MBTA V3 JSON API guide", url: "https://www.mbta.com/developers/v3-api" },
  mbtaRoutes: { label: "MBTA V3 bus-routes JSON response", url: "https://api-v3.mbta.com/routes?filter[type]=3" },
  sklearn: { label: "scikit-learn user guide", url: "https://scikit-learn.org/stable/user_guide.html" },
  pandas: { label: "pandas user guide", url: "https://pandas.pydata.org/docs/user_guide/" },
  owasp: { label: "OWASP testing guidance", url: "https://owasp.org/www-project-web-security-testing-guide/" },
  juiceShop: { label: "OWASP Juice Shop setup", url: "https://owasp.org/www-project-juice-shop/" },
  dvwa: { label: "DVWA setup and safety notes", url: "https://github.com/digininja/DVWA" },
  burp: { label: "Burp Suite getting started", url: "https://portswigger.net/burp/documentation/desktop/getting-started" },
  arduino: { label: "Arduino documentation", url: "https://docs.arduino.cc/" },
  autodesk: { label: "Autodesk learning resources", url: "https://www.autodesk.com/learn" },
  matlab: { label: "MathWorks documentation", url: "https://www.mathworks.com/help/" },
  sec: { label: "SEC EDGAR company filings", url: "https://www.sec.gov/edgar/search/" },
  ga: { label: "Google Analytics documentation", url: "https://developers.google.com/analytics" },
  wcag: { label: "W3C WCAG quick reference", url: "https://www.w3.org/WAI/WCAG22/quickref/" },
  figma: { label: "Figma help center", url: "https://help.figma.com/" },
  cdc: { label: "CDC data and statistics", url: "https://data.cdc.gov/" },
  dol: { label: "U.S. Department of Labor data", url: "https://www.dol.gov/agencies/oasp/evaluation/resources" },
  congress: { label: "Congress.gov research resources", url: "https://www.congress.gov/" },
  census: { label: "U.S. Census data", url: "https://data.census.gov/" },
  lean: { label: "Lean Enterprise Institute resources", url: "https://www.lean.org/explore-lean/" },
  zotero: { label: "Zotero research guide", url: "https://www.zotero.org/support/quick_start_guide" },
  canva: { label: "Canva Design School", url: "https://www.canva.com/designschool/" },
  plainLanguage: { label: "Federal plain-language guidelines", url: "https://www.plainlanguage.gov/guidelines/" },
  excelHelp: { label: "Microsoft Excel help", url: "https://learn.microsoft.com/excel/" },
  googleSheets: { label: "Google Sheets API concepts", url: "https://developers.google.com/sheets/api/guides/concepts" },
  epaGhg: { label: "EPA GHG Emission Factors Hub", url: "https://www.epa.gov/climateleadership/ghg-emission-factors-hub" },
  edaPlayground: { label: "EDA Playground (free HDL simulator)", url: "https://www.edaplayground.com/" },
  verilator: { label: "Verilator user guide", url: "https://verilator.org/guide/latest/" },
  hdlGithub: { label: "HDLBits Verilog examples on GitHub", url: "https://github.com/hdlbits/hdlbits.github.io" },
  ltspice: {
    label: "Analog Devices LTspice",
    url: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html",
  },
  ltspiceGettingStarted: {
    label: "LTspice getting started",
    url: "https://www.analog.com/en/resources/evaluation-hardware-and-software/software/ltspice.html",
  },
  mpptBasics: {
    label: "All About Circuits MPPT overview",
    url: "https://www.allaboutcircuits.com/technical-articles/maximum-power-point-tracking-mppt-charge-controller/",
  },
  octave: { label: "GNU Octave documentation", url: "https://docs.octave.org/latest/" },
  octaveSignal: { label: "GNU Octave signal package functions", url: "https://octave.sourceforge.io/signal/overview.html" },
  matlabSignal: { label: "MathWorks Signal Processing Toolbox", url: "https://www.mathworks.com/help/signal/" },
  simscaleDocs: { label: "SimScale documentation", url: "https://www.simscale.com/docs/" },
  simscaleCommunity: { label: "SimScale Community (free FEA path)", url: "https://www.simscale.com/product/community/" },
  ansysStudent: { label: "Ansys Student limits and download", url: "https://www.ansys.com/academic/students" },
  davinciResolve: {
    label: "DaVinci Resolve free editor training",
    url: "https://www.blackmagicdesign.com/products/davinciresolve/training",
  },
  filmmakingBasics: { label: "BBC filming and interview tips", url: "https://www.bbc.co.uk/bitesize/guides/z2nq7ty/revision/1" },
  react: { label: "React Learn", url: "https://react.dev/learn" },
  node: { label: "Node.js documentation", url: "https://nodejs.org/docs/latest/api/" },
  express: { label: "Express getting started", url: "https://expressjs.com/en/starter/installing.html" },
  postgresql: { label: "PostgreSQL documentation", url: "https://www.postgresql.org/docs/current/" },
  renderFree: { label: "Render free services and limits", url: "https://render.com/docs/free" },
  jwt: { label: "node-jsonwebtoken documentation", url: "https://github.com/auth0/node-jsonwebtoken" },
  postman: { label: "Postman getting started", url: "https://learning.postman.com/docs/getting-started/overview/" },
  openapi: { label: "OpenAPI 3 specification guide", url: "https://swagger.io/docs/specification/v3_0/about/" },
  creativeCommons: { label: "Creative Commons license guide", url: "https://creativecommons.org/share-your-work/cclicenses/" },
  freecad: { label: "FreeCAD getting started", url: "https://wiki.freecad.org/Getting_started" },
  freecadSimscale: { label: "FreeCAD to SimScale workflow", url: "https://www.simscale.com/technology/integrations-partners/freecad/" },
  libreoffice: { label: "LibreOffice guides", url: "https://documentation.libreoffice.org/en/english-documentation/" },
  projectLibre: { label: "ProjectLibre free scheduler", url: "https://www.projectlibre.com/" },
  treasuryRates: {
    label: "U.S. Treasury interest-rate data",
    url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
  },
  damodaran: { label: "NYU Damodaran valuation data", url: "https://pages.stern.nyu.edu/~adamodar/" },
  nasdaq: { label: "Nasdaq public market data", url: "https://www.nasdaq.com/market-activity/stocks" },
  hudFmr: { label: "HUD Fair Market Rents", url: "https://www.huduser.gov/portal/datasets/fmr.html" },
  damodaranRealEstate: {
    label: "NYU Damodaran income-property valuation spreadsheet",
    url: "https://pages.stern.nyu.edu/adamodar/New_Home_Page/spreadsh.htm",
  },
  excelPmt: { label: "Microsoft Excel PMT function", url: "https://support.microsoft.com/en-US/Excel/pmt-function" },
  excelIrr: { label: "Microsoft Excel IRR function", url: "https://support.microsoft.com/en-us/excel/functions/irr-function" },
  excelFormulas: {
    label: "Microsoft Excel formula guidance",
    url: "https://support.microsoft.com/en-us/Excel/get-started/overview-of-formulas-in-excel",
  },
  sheetsIrr: { label: "Google Sheets IRR function", url: "https://support.google.com/docs/answer/3093231?hl=en" },
  sheetsPower: { label: "Google Sheets POWER function", url: "https://support.google.com/docs/answer/3093433/power-function?hl=en" },
  redfinData: { label: "Redfin Data Center", url: "https://www.redfin.com/news/data-center/" },
  blsOews: { label: "BLS OEWS wage data", url: "https://www.bls.gov/oes/tables.htm" },
  figmaShare: { label: "Figma prototype sharing", url: "https://help.figma.com/hc/en-us/articles/360040531773-Share-files-and-prototypes" },
  clipchamp: { label: "Microsoft Clipchamp help", url: "https://support.microsoft.com/clipchamp" },
  merchantListings: { label: "Google Merchant product-data guidance", url: "https://support.google.com/merchants/answer/7052112" },
  nextjsDeploy: { label: "Next.js deployment documentation", url: "https://nextjs.org/docs/app/getting-started/deploying" },
  astroDeploy: { label: "Astro deployment guide", url: "https://docs.astro.build/en/guides/deploy/" },
  vercelHobby: { label: "Vercel Hobby plan documentation", url: "https://vercel.com/docs/plans/hobby" },
  uciStudent: { label: "UCI Student Performance dataset", url: "https://archive.ics.uci.edu/dataset/320/student+performance" },
  uciAdult: { label: "UCI Adult dataset", url: "https://archive.ics.uci.edu/dataset/2/adult" },
  fairlearn: { label: "Fairlearn user guide", url: "https://fairlearn.org/main/user_guide/index.html" },
  textblob: { label: "TextBlob documentation", url: "https://textblob.readthedocs.io/en/dev/" },
  streamlit: { label: "Streamlit documentation", url: "https://docs.streamlit.io/" },
  uciSentiment: {
    label: "UCI Sentiment Labelled Sentences dataset",
    url: "https://archive.ics.uci.edu/dataset/331/sentiment+labelled+sentences",
  },
  cdcPlaces: { label: "CDC PLACES data portal", url: "https://www.cdc.gov/places/tools/data-portal.html" },
  openMlTelco: { label: "OpenML Telco Customer Churn dataset", url: "https://www.openml.org/search?type=data&status=active&id=42178" },
  scipyStats: { label: "SciPy statistical functions", url: "https://docs.scipy.org/doc/scipy/reference/stats.html" },
  rfc5322: { label: "RFC 5322 email message format", url: "https://datatracker.ietf.org/doc/html/rfc5322" },
  rfcEmailAuth: { label: "NIST trustworthy email guidance", url: "https://www.nist.gov/publications/trustworthy-email" },
  testNet: { label: "RFC 5737 documentation address blocks", url: "https://datatracker.ietf.org/doc/html/rfc5737" },
  wiresharkGuide: { label: "Wireshark user guide", url: "https://www.wireshark.org/docs/wsug_html_chunked/" },
  wiresharkSamples: { label: "Wireshark sample captures", url: "https://wiki.wireshark.org/SampleCaptures" },
  wokwiArduino: { label: "Wokwi Arduino simulator guide", url: "https://docs.wokwi.com/guides/arduino" },
  librecad: { label: "LibreCAD user manual", url: "https://docs.librecad.org/en/latest/" },
  finraBonds: { label: "FINRA fixed-income data guidance", url: "https://www.finra.org/finra-data/fixed-income" },
  secCompanySearch: { label: "SEC company filings search", url: "https://www.sec.gov/edgar/search-and-access" },
  apple2044Note: {
    label: "SEC terms for Apple 4.45% Notes due 2044",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000119312514168389/d720312dfwp.htm",
  },
  sbaMarket: {
    label: "U.S. SBA market research guidance",
    url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis",
  },
  doeHeatPumps: { label: "U.S. DOE heat-pump guidance", url: "https://www.energy.gov/energysaver/heat-pump-systems" },
  eiaResidential: { label: "U.S. EIA residential energy data", url: "https://www.eia.gov/consumption/residential/data/2020/" },
  mitBeerGame: { label: "MIT Beer Game teaching resource", url: "https://mitsloan.mit.edu/teaching-resources-library/beer-game-online" },
  adaAccessibleRoutes: {
    label: "U.S. Access Board accessible-route guide",
    url: "https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/",
  },
  oshaExitRoutes: { label: "OSHA exit-route requirements", url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36" },
  nhanes: {
    label: "CDC NHANES 2017-2018 data files",
    url: "https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017",
  },
  tableauAccessibility: {
    label: "Tableau dashboard accessibility guidance",
    url: "https://help.tableau.com/current/pro/desktop/en-us/accessibility_dashboards.htm",
  },
  chicagoComposting: {
    label: "City of Chicago composting information",
    url: "https://www.chicago.gov/city/en/sites/chicago-recycles/home/food-scrap-drop-off.html",
  },
  chicagoCode: { label: "Chicago Municipal Code", url: "https://codelibrary.amlegal.com/codes/chicago/latest/chicago_il/0-0-0-2480745" },
  loperBright: { label: "U.S. Supreme Court Loper Bright opinion", url: "https://www.supremecourt.gov/opinions/23pdf/22-451_7m58.pdf" },
  courtListener: {
    label: "CourtListener case record",
    url: "https://www.courtlistener.com/docket/66814128/loper-bright-enterprises-v-raimondo/",
  },
  googleForms: { label: "Google Forms authoring guide", url: "https://support.google.com/docs/answer/6281888?hl=en" },
  pewSurveyQuestions: {
    label: "Pew Research Center survey-question guidance",
    url: "https://www.pewresearch.org/writing-survey-questions/",
  },
  aaporSurveyPractice: { label: "AAPOR survey-research best practices", url: "https://aapor.org/standards-and-ethics/best-practices/" },
  usabilityHeuristics: { label: "Nielsen Norman usability heuristics", url: "https://www.nngroup.com/articles/ten-usability-heuristics/" },
  waiEvaluation: { label: "WAI website accessibility evaluation", url: "https://www.w3.org/WAI/test-evaluate/" },
  axeDocs: { label: "axe DevTools documentation", url: "https://docs.deque.com/devtools-for-web/4/en/" },
  lighthouseAccessibility: { label: "Lighthouse accessibility audits", url: "https://developer.chrome.com/docs/lighthouse/accessibility/" },
  oerCommons: { label: "OER Commons authoring help", url: "https://help.oercommons.org/support/solutions/folders/42000096702" },
  pressbooks: { label: "Pressbooks open publishing guide", url: "https://guide.pressbooks.com/" },
  rcfp: { label: "Reporters Committee legal guide", url: "https://www.rcfp.org/resources/" },
  foia: { label: "FOIA.gov request and records guidance", url: "https://www.foia.gov/how-to.html" },
} satisfies Record<string, RoadmapResource>;

const FULL_RESOURCE_PROJECT_IDS = new Set([
  "P001",
  "P004",
  "P006",
  "P007",
  "P014",
  "P019",
  "P022",
  "P023",
  "P027",
  "P028",
  "P029",
  "P034",
  "P036",
  "P038",
  "P039",
  "P040",
  "P047",
  "P048",
  "P051",
  "P052",
  "P057",
  "P059",
  "P061",
  "P063",
  "P066",
  "P070",
  "P071",
  "P076",
  "P079",
  "P083",
  "P086",
  "P087",
  "P088",
  "P090",
  "P093",
  "P095",
  "P096",
  "P098",
  "P100",
  "P101",
  "P102",
  "P104",
  "P107",
  "P110",
  "P111",
  "P113",
  "P114",
]);

const RECIPES: Record<string, Recipe> = {
  software: recipe(
    "Define the user and working boundary",
    "Identify the user, primary workflow, data boundary, and failure conditions before implementation.",
    "Implement the primary workflow",
    "Build the smallest end-to-end version that performs the project’s central job with real inputs.",
    "Test behavior and release readiness",
    "Exercise the happy path, invalid inputs, empty states, and setup instructions before release.",
    "implement",
    "repeatable functional tests",
    [RESOURCES.github, RESOURCES.mdn],
  ),
  ai: recipe(
    "Define the task and evaluation contract",
    "Specify the input, expected output, baseline, evaluation set, and metric before building the AI artifact.",
    "Build the data and model workflow",
    "Prepare the data or knowledge source, implement the selected approach, and preserve reproducible configuration.",
    "Compare results and investigate failures",
    "Run the same evaluation against the baseline, inspect incorrect outputs, and document limitations.",
    "train or configure",
    "baseline comparison and error analysis",
    [RESOURCES.sklearn, RESOURCES.python],
  ),
  data: recipe(
    "Frame the decision and measures",
    "Write the concrete decision questions, required fields, KPIs, and source limitations before analysis.",
    "Prepare the data and analysis",
    "Clean the source, document transformations, calculate the measures, and build the requested analytical view.",
    "Validate findings against the source",
    "Reconcile surprising values, test calculations, and connect each conclusion to traceable evidence.",
    "analyze",
    "source reconciliation and calculation checks",
    [RESOURCES.pandas, RESOURCES.python],
  ),
  cybersecurity: recipe(
    "Define scope and safe-testing rules",
    "Identify authorized systems, assets, threat assumptions, evidence boundaries, and prohibited actions.",
    "Run the security investigation",
    "Configure the approved tools, reproduce the scenario safely, and preserve an auditable activity log.",
    "Confirm findings and severity",
    "Remove false positives, reproduce confirmed findings, and connect severity to observable impact.",
    "investigate",
    "safe reproduction and false-positive review",
    [RESOURCES.owasp, RESOURCES.github],
  ),
  engineering: recipe(
    "Define requirements and engineering constraints",
    "List inputs, outputs, operating limits, safety constraints, interfaces, and measurable performance targets.",
    "Design and build the engineering artifact",
    "Create the schematic, model, code, or assembly and record the assumptions behind major design decisions.",
    "Test performance and reliability",
    "Run repeatable tests against each requirement, record measurements, and resolve the highest-risk failure.",
    "design and build",
    "requirements-based testing and measurement",
    [RESOURCES.arduino, RESOURCES.autodesk],
  ),
  construction: recipe(
    "Define site scope, standards, and constraints",
    "Record the site or model boundary, governing references, assumptions, safety constraints, and required outputs.",
    "Produce the construction control artifact",
    "Build the drawing, model, schedule, estimate, or audit with traceable sources and assumptions.",
    "Check constructability and risk",
    "Review quantities, dependencies, code references, safety risks, and inconsistencies before issue.",
    "produce",
    "constructability, quantity, and risk review",
    [RESOURCES.autodesk, RESOURCES.plainLanguage],
  ),
  finance: recipe(
    "Define the decision and financial assumptions",
    "Identify the company or asset, decision horizon, source filings, assumptions, and financial checks.",
    "Build the financial analysis",
    "Create linked calculations, document assumptions, and add controls for broken formulas or implausible outputs.",
    "Test scenarios and interpret sensitivity",
    "Run base, upside, and downside cases and explain which assumptions drive the decision.",
    "model",
    "formula audit and scenario analysis",
    [RESOURCES.sec, RESOURCES.census],
  ),
  marketing: recipe(
    "Define the audience and measurable objective",
    "Choose the audience, desired action, channel, message, baseline, and success measure.",
    "Create the campaign or audit assets",
    "Produce the requested content, research, tracking, or implementation assets for the defined audience.",
    "Evaluate performance and message quality",
    "Compare the work with the objective, inspect available metrics or alternatives, and identify concrete improvements.",
    "create",
    "objective-based message and performance review",
    [RESOURCES.ga, RESOURCES.canva],
  ),
  consulting: recipe(
    "Define the client decision and issue tree",
    "Clarify the stakeholder, decision, scope, assumptions, research questions, and evidence standard.",
    "Build the analysis and recommendation",
    "Gather credible evidence, analyze the priority branches, and develop a recommendation that addresses the decision.",
    "Pressure-test the recommendation",
    "Check logic, counterarguments, implementation constraints, and whether every claim is supported.",
    "analyze",
    "logic, evidence, and implementation review",
    [RESOURCES.census, RESOURCES.plainLanguage],
  ),
  operations: recipe(
    "Map the current process and target",
    "Document inputs, owners, handoffs, delays, constraints, baseline measures, and the improvement target.",
    "Build the improved operating approach",
    "Analyze the bottleneck and create the model, workflow, layout, forecast, or control system requested.",
    "Test capacity, exceptions, and handoffs",
    "Evaluate the proposed process under normal and exception conditions and quantify the expected improvement.",
    "optimize",
    "capacity, exception, and handoff analysis",
    [RESOURCES.lean, RESOURCES.census],
  ),
  realEstate: recipe(
    "Define the market and property decision",
    "Specify geography, property type, audience, comparison period, source rules, and the decision to support.",
    "Build the property evidence and analysis",
    "Normalize comparable data or create the requested property asset with cited market assumptions.",
    "Check comparables, tradeoffs, and risk",
    "Review outliers, sensitivity, location tradeoffs, and limitations before recommending action.",
    "analyze",
    "comparable-property and sensitivity review",
    [RESOURCES.census, RESOURCES.sec],
  ),
  healthcare: recipe(
    "Define the health context and privacy boundary",
    "State the population, workflow or device need, intended use, de-identification rules, and non-clinical limits.",
    "Build the responsible health artifact",
    "Prepare the data, workflow, prototype, or analysis while documenting sources, assumptions, and privacy controls.",
    "Validate without clinical overclaiming",
    "Check the main finding or behavior, record limitations, and distinguish operational evidence from medical conclusions.",
    "develop",
    "privacy, limitation, and operational validation",
    [RESOURCES.cdc, RESOURCES.plainLanguage],
  ),
  hr: recipe(
    "Define the people decision and ethical boundary",
    "Map the employee or candidate journey, decision owner, success measure, privacy needs, and fairness risks.",
    "Build the people-process analysis",
    "Structure the survey, benchmark, audit, or workflow and document the evidence behind recommendations.",
    "Review fairness, privacy, and practicality",
    "Test the recommendation for subgroup impact, confidentiality, implementation burden, and measurable follow-through.",
    "analyze",
    "fairness, privacy, and implementation review",
    [RESOURCES.dol, RESOURCES.plainLanguage],
  ),
  legal: recipe(
    "Define the issue, jurisdiction, and authority",
    "Narrow the legal or policy question, jurisdiction, stakeholders, date boundary, and authoritative sources.",
    "Build the cited legal or policy analysis",
    "Organize rules, cases, public evidence, stakeholder concerns, and practical options with traceable citations.",
    "Check authority, counterarguments, and impact",
    "Verify citations, distinguish binding from persuasive authority, and evaluate implementation tradeoffs.",
    "research",
    "citation, authority, and counterargument review",
    [RESOURCES.congress, RESOURCES.plainLanguage],
  ),
  design: recipe(
    "Define the user and design problem",
    "Describe the primary user scenario, observed friction, constraints, accessibility needs, and success criteria.",
    "Create and document the design solution",
    "Produce the research, structure, visual system, or prototype and connect key decisions to user evidence.",
    "Evaluate usability and accessibility",
    "Run an appropriate heuristic, accessibility, or lightweight user review and document resulting changes.",
    "design",
    "usability and accessibility review",
    [RESOURCES.figma, RESOURCES.wcag],
  ),
  education: recipe(
    "Define the learner and learning outcome",
    "Specify the learner, context, prior knowledge, measurable outcome, accessibility needs, and evidence boundary.",
    "Build the learning or research artifact",
    "Create the curriculum, pilot, research output, or support process and document the instructional rationale.",
    "Evaluate learning evidence and limitations",
    "Review the work against the outcome, available learner evidence, accessibility, and responsible interpretation.",
    "develop",
    "learning-outcome and accessibility review",
    [RESOURCES.zotero, RESOURCES.plainLanguage],
  ),
  media: recipe(
    "Define the audience, story, and publishing standard",
    "Identify the audience, central idea, format, source and consent rules, production scope, and success measure.",
    "Produce the complete media draft",
    "Research, script, record, edit, and package the requested media artifact with organized source material.",
    "Edit for accuracy, clarity, and audience",
    "Review factual claims, pacing, accessibility, rights, and whether the finished work delivers the intended story.",
    "produce",
    "editorial, factual, and accessibility review",
    [RESOURCES.plainLanguage, RESOURCES.canva],
  ),
  retail: recipe(
    "Define the customer behavior and commercial target",
    "Specify the customer, product or store context, baseline behavior, constraints, and measurable target.",
    "Build the retail intervention and analysis",
    "Create the listing, floor plan, operating plan, or experiment and document assumptions and costs.",
    "Evaluate customer impact and economics",
    "Compare before and after behavior where available and review margin, conversion, capacity, and execution risks.",
    "optimize",
    "customer, conversion, and unit-economics review",
    [RESOURCES.census, RESOURCES.ga],
  ),
  research: recipe(
    "Define the research question and evidence standard",
    "Narrow the question, audience, source criteria, ethical constraints, method, and expected contribution.",
    "Build the research artifact",
    "Collect and organize credible evidence, execute the method, and preserve citations and reproducible notes.",
    "Review validity, limitations, and communication",
    "Check evidence quality, alternative explanations, limitations, and whether conclusions match the method.",
    "research",
    "validity, citation, and limitation review",
    [RESOURCES.zotero, RESOURCES.plainLanguage],
  ),
};

export function buildCanonicalRoadmap(project: RoadmapProjectInput, requirements: SubmissionRequirements): CanonicalRoadmapPlan {
  const recipeValue = recipeForProject(project);
  const guidance = guidanceForProject(project.id);
  const requiredSkills = distinct(splitCsv(project.skills).concat(splitCsv(project.skillTags)))
    .filter((skill) => skill.toLowerCase() !== "none")
    .slice(0, 5);
  const weights = [0.1, 0.1, 0.35, 0.25, 0.2];
  const ids = ["scope", "setup", "build", "validate", "package"].map((suffix) => `${project.id}:v1:${suffix}`);
  const artifact = project.deliverable?.trim() || `Completed ${project.title} deliverable`;
  const requirementKeys = requirements.items.filter((item) => item.required).map((item) => item.key);
  const requirementNames = requirements.items.filter((item) => item.required).map((item) => item.title);
  const isTransitApiCli = project.id === "P001";
  const isVulnerableWebAppLab = project.id === "P034";
  const isFpgaBinaryCalculator = project.id === "P039";
  const isFeaBicycleFrame = project.id === "P052";
  const isShortDocumentary = project.id === "P111";
  const checkpoints: CanonicalCheckpoint[] = [
    checkpoint(project, recipeValue, ids, 0, weights, {
      title: recipeValue.scopeTitle,
      objective: isTransitApiCli
        ? "Choose one MBTA V3 JSON API workflow, define the command-line inputs and outputs, and set the live-data and offline-fixture boundaries before implementation."
        : isVulnerableWebAppLab
          ? "Define the authorized target, isolation method, evidence boundaries, and prohibited actions. Testing is limited to a locally run DVWA or OWASP Juice Shop instance; public or third-party systems are out of scope."
          : `${recipeValue.scopeObjective} Apply that scope specifically to ${project.title}.`,
      coreActions:
        guidance.scopeActions ??
        (isTransitApiCli
          ? [
              "Choose one bounded MBTA workflow using the V3 JSON API: list bus routes, look up stops, or show arrival predictions for a supplied stop ID.",
              "Record the exact endpoint, filters, JSON:API fields, MassDOT data-license source, and expected command-line output.",
              "Define an offline fallback that saves one successful response as fixtures/mbta-response.json and passes it through the same parser as live data.",
              `List the required components of the final deliverable: ${artifact}.`,
            ]
          : isVulnerableWebAppLab
            ? [
                "Name DVWA or OWASP Juice Shop as the only authorized target, record its local URL and version, and describe how it is isolated.",
                "List prohibited actions, including scanning or testing any public, shared, school, employer, or third-party system.",
                `List the required components of the final deliverable: ${artifact}.`,
                "Define success measures for reproducibility, evidence sanitization, severity rationale, mitigation quality, and remediation checks.",
              ]
            : [
                `Write the exact goal of ${project.title} and name the person who will use or review it.`,
                `List the required components of the final deliverable: ${artifact}.`,
                "Record constraints, assumptions, source rules, and a measurable standard for success.",
              ]),
      requiredOutput: `A one-page scope for ${project.title} covering audience, constraints, sources, success measures, and every deliverable component.`,
      done: isTransitApiCli
        ? [
            "The scope names one MBTA V3 endpoint, its filters, the selected JSON:API fields, and the expected CLI output.",
            "The live request and fixtures/mbta-response.json use the same parser and output contract.",
            `Every component of "${artifact}" appears in the work plan with measurable success criteria.`,
          ]
        : isVulnerableWebAppLab
          ? [
              "The scope names a locally run DVWA or OWASP Juice Shop instance as the only authorized target.",
              "Testing public, shared, school, employer, and third-party systems is explicitly prohibited.",
              `Every component of "${artifact}" appears in the work plan with testable success measures.`,
            ]
          : (guidance.scopeDone ?? [
              `The scope names the intended audience and the decision or task ${project.title} supports.`,
              `Every component of "${artifact}" appears in the work plan.`,
              "Success measures and the most important constraint are written in testable language.",
            ]),
      mode: "NOTE",
      submissionKeys: [],
      prerequisites: [],
    }),
    checkpoint(project, recipeValue, ids, 1, weights, {
      title: "Prepare the workspace, sources, and inputs",
      objective: `Create an organized, reproducible starting point for ${project.title} before producing the main work.`,
      coreActions:
        guidance.setupActions ??
        (isTransitApiCli
          ? [
              "Create a Python virtual environment and verify argparse, json, and urllib.request with the supported Python version.",
              "Make one HTTPS request to the documented MBTA endpoint, record the retrieval date, and save the successful JSON response as fixtures/mbta-response.json.",
              "Add README setup instructions, document that an optional MBTA API key belongs in an environment variable, and never commit credentials.",
            ]
          : isVulnerableWebAppLab
            ? [
                "Choose DVWA or OWASP Juice Shop and install it locally using its official setup guide; do not target a public deployment.",
                "Install Burp Suite Community, record the lab and tool versions, and confirm the proxy reaches only the isolated lab.",
                "Create separate folders for sanitized screenshots, reproducible notes, remediation checks, and final submission files.",
              ]
            : isFpgaBinaryCalculator
              ? [
                  "Open EDA Playground or install Verilator, record the chosen free HDL/FPGA flow, and confirm a trivial Verilog or VHDL sim runs.",
                  "State whether the deliverable will be simulation-only or also use a physical FPGA board; board access is optional.",
                  "Create folders for HDL sources, simulation waveforms or logs, schematics, and final submission files.",
                ]
              : isFeaBicycleFrame
                ? [
                    "Choose SimScale Community (preferred free cloud path) or Ansys Student, record the product tier, and document mesh/node or model-size limits.",
                    "Run a trivial FEA smoke test (simple beam or plate) and save a screenshot proving the solver completes before starting the bicycle frame.",
                    "Create folders for CAD geometry, solver inputs, stress maps, and the technical memo.",
                  ]
                : isShortDocumentary
                  ? [
                      "Install DaVinci Resolve or CapCut (free), confirm export works, and record the editor version.",
                      "Prepare interview consent notes, a shot list, and folders for raw footage, proxies, and the final cut.",
                      "Save initial filming and editing references from the resources list.",
                    ]
                  : [
                      `Set up the tools needed for ${requiredSkills.slice(0, 3).join(", ") || project.title}.`,
                      "Create folders for source material, working files, validation evidence, and final submission files.",
                      "Save the initial sources or inputs and record where each came from.",
                    ]),
      requiredOutput: `An organized workspace for ${project.title} with working tools and a traceable source or input log.`,
      done:
        guidance.setupDone ??
        (isTransitApiCli
          ? [
              "The documented MBTA request returns JSON:API data and the retrieval date and endpoint are recorded.",
              "fixtures/mbta-response.json exists, contains no credentials, and can be parsed without network access.",
              "README setup instructions identify the supported Python version and optional environment-variable API key.",
            ]
          : isVulnerableWebAppLab
            ? [
                "DVWA or OWASP Juice Shop runs locally in an isolated environment and its version is recorded.",
                "Burp Suite Community is configured only for the authorized local lab target.",
                "The workspace separates raw lab evidence from sanitized portfolio-ready files and contains no credentials or secrets.",
              ]
            : isFpgaBinaryCalculator
              ? [
                  "EDA Playground or Verilator runs a trivial HDL simulation and the chosen free flow is recorded.",
                  "The student states whether the demo will be simulation-only or hardware-backed.",
                  "Working, simulation, and final files have distinct locations.",
                ]
              : isFeaBicycleFrame
                ? [
                    "SimScale Community or Ansys Student is selected, and its free-tier limits are written down.",
                    "A trivial FEA smoke-test screenshot proves the solver path works before the bicycle-frame model begins.",
                    "Working, validation, and final files have distinct locations.",
                  ]
                : isShortDocumentary
                  ? [
                      "DaVinci Resolve or CapCut opens, exports successfully, and its version is recorded.",
                      "Consent notes and a shot list exist before filming starts.",
                      "Raw footage, working edits, and final submission files have distinct locations.",
                    ]
                  : [
                      "The primary tools open successfully and can save or export the required format.",
                      "Every initial source or input has a saved location and origin.",
                      "Working, validation, and final files have distinct locations.",
                    ]),
      mode: "CONFIRM",
      submissionKeys: [],
      prerequisites: [ids[0]],
    }),
    checkpoint(project, recipeValue, ids, 2, weights, {
      title: recipeValue.buildTitle,
      objective: isTransitApiCli
        ? `Build a Python CLI that fetches one bounded MBTA V3 JSON API workflow, parses the JSON:API response, and produces the same output from a versioned offline fixture. The first complete version must cover: ${artifact}.`
        : isVulnerableWebAppLab
          ? `Reproduce selected OWASP Top 10 scenarios only in the authorized local lab and preserve a sanitized, auditable activity log. The first complete version must cover: ${artifact}.`
          : `${recipeValue.buildObjective} The first complete version must cover: ${artifact}.`,
      coreActions:
        guidance.buildActions ??
        (isTransitApiCli
          ? [
              "Implement argparse commands and options for the selected route, stop, or prediction lookup.",
              "Fetch the documented MBTA HTTPS endpoint with a timeout, parse data and included JSON:API objects, and format a readable terminal result.",
              "Add a fixture mode that reads fixtures/mbta-response.json through the same parser, plus clear messages for invalid input, HTTP errors, malformed JSON, and empty results.",
            ]
          : isVulnerableWebAppLab
            ? [
                "Choose a bounded set of OWASP Top 10 scenarios and reproduce each only against the authorized local lab.",
                "For every finding, record the lab version, tool version, configuration, exact reproduction steps, and sanitized evidence.",
                "Document a preliminary severity rationale, mitigation, and any unresolved false-positive or safety concern.",
              ]
            : isShortDocumentary
              ? [
                  "Film consent-based interviews and b-roll using the shot list, then edit the 5-7 minute cut in DaVinci Resolve or CapCut.",
                  `Produce each requested component: ${artifact}.`,
                  "Record major editing decisions, rights/consent status, and unresolved production risks while the cut is still easy to revise.",
                ]
              : [
                  `${capitalize(recipeValue.buildVerb)} the first complete version of ${project.title} using the approved sources and inputs.`,
                  `Produce each requested component: ${artifact}.`,
                  "Record major decisions, assumptions, and unresolved risks while the work is still easy to revise.",
                ]),
      requiredOutput: `A complete first version of ${artifact}, plus a short record of the decisions and assumptions used to create it.`,
      done: isTransitApiCli
        ? [
            `Every named component of "${artifact}" exists in inspectable form.`,
            "Live and fixture modes use the same JSON:API parser and produce the same output structure.",
            "Invalid input, timeouts, HTTP errors, malformed JSON, and empty responses produce actionable messages rather than tracebacks.",
          ]
        : isVulnerableWebAppLab
          ? [
              `Every named component of "${artifact}" exists in inspectable form.`,
              "Every finding identifies the authorized local lab and includes sanitized, repeatable evidence.",
              "No credentials, tokens, host identifiers, or instructions targeting non-lab systems appear in the portfolio files.",
            ]
          : (guidance.buildDone ?? [
              `Every named component of "${artifact}" exists in inspectable form.`,
              "The primary workflow, analysis, or argument runs from input to output without a missing central section.",
              "At least one important decision and one unresolved risk are documented.",
            ]),
      mode: "NOTE",
      submissionKeys: [],
      prerequisites: [ids[1]],
    }),
    checkpoint(project, recipeValue, ids, 3, weights, {
      title: isTransitApiCli
        ? "Test live, offline, and failure behavior"
        : isVulnerableWebAppLab
          ? "Confirm findings and verify remediation"
          : recipeValue.validationTitle,
      objective: isTransitApiCli
        ? "Verify equivalent live and fixture behavior, then exercise invalid input, network, HTTP, parsing, and empty-result failures before release."
        : isVulnerableWebAppLab
          ? "Remove false positives, reproduce confirmed findings, justify severity using observable lab impact, document mitigations, and verify remediation where the chosen lab supports it."
          : `${recipeValue.validationObjective} Use ${recipeValue.validationMethod} for ${project.title}.`,
      coreActions:
        guidance.validationActions ??
        (isTransitApiCli
          ? [
              "Run the same successful lookup in live and fixture modes and compare their normalized terminal output.",
              "Test invalid arguments, a timeout, a non-success HTTP response, malformed JSON, missing JSON:API fields, and an empty data array.",
              "Verify tests run offline from the committed fixture and scan the repository and demo for keys, tokens, or sensitive local data.",
            ]
          : isVulnerableWebAppLab
            ? [
                "Reproduce every claimed finding from a clean lab state and remove any result that cannot be repeated.",
                "Tie each severity rating to observable impact in the lab and document a concrete mitigation.",
                "Apply or simulate the mitigation where supported, then capture sanitized before-and-after evidence and remaining limitations.",
              ]
            : [
                `Test ${project.title} against every definition-of-done item from the scope.`,
                `Use ${recipeValue.validationMethod} and preserve the results.`,
                "Resolve the highest-risk failure, then repeat the affected check and record the change.",
              ]),
      requiredOutput: `A validation log for ${project.title} showing checks performed, failures found, changes made, and remaining limitations.`,
      done: isTransitApiCli
        ? [
            "Live and fixture modes have recorded passing results for the same successful lookup.",
            "Every named failure path has a recorded expected message and produces no unhandled traceback.",
            "Offline tests pass and the repository and demo contain no API keys, tokens, or sensitive local data.",
          ]
        : isVulnerableWebAppLab
          ? [
              "Every retained finding is reproducible and has a severity rationale tied to observable lab impact.",
              "Every retained finding includes a mitigation and a remediation check where the lab supports one.",
              "False positives, unsupported remediation checks, and remaining limitations are clearly identified.",
            ]
          : (guidance.validationDone ?? [
              "Every success measure from the scope has a recorded result.",
              "The highest-risk failure has a documented correction and retest.",
              "Remaining limitations are stated without overstating the project outcome.",
            ]),
      mode: "NOTE",
      submissionKeys: [],
      prerequisites: [ids[2]],
    }),
    checkpoint(project, recipeValue, ids, 4, weights, {
      title: "Package and verify the final submission",
      objective: `Turn the finished work into a reviewable package containing ${artifact} and every required evidence item.`,
      coreActions: guidance.packageActions ?? [
        `Revise and organize the final ${artifact}.`,
        `Add the required submission evidence: ${requirementNames.join(", ") || "finished project evidence"}.`,
        "Open every uploaded file or link from the submission preview and confirm a reviewer can understand it without extra explanation.",
      ],
      requiredOutput: artifact,
      done: guidance.packageDone ?? [
        `The final package contains ${artifact}.`,
        `Every required evidence item is present: ${requirementNames.join(", ") || "finished project evidence"}.`,
        "Files and links open successfully, sensitive information is removed, and setup or review instructions are included.",
      ],
      mode: "EVIDENCE",
      submissionKeys: requirementKeys,
      prerequisites: [ids[3]],
    }),
  ];
  return {
    schemaVersion: 1,
    projectId: project.id,
    projectTitle: project.title,
    version: 1,
    authoredBy: "Intrnd roadmap catalog v1",
    reviewedBy: "Intrnd independent roadmap QA v1",
    checkpoints,
  };
}

function checkpoint(
  project: RoadmapProjectInput,
  recipeValue: Recipe,
  ids: string[],
  index: number,
  weights: number[],
  input: {
    title: string;
    objective: string;
    coreActions: string[];
    requiredOutput: string;
    done: string[];
    mode: CanonicalCheckpoint["completionMode"];
    submissionKeys: string[];
    prerequisites: string[];
  },
): CanonicalCheckpoint {
  const standardMinutes = Math.max(30, Math.round((estimateCatalogMinutes(project.estimatedHours) * weights[index]) / 15) * 15);
  const guidedActions = [
    `Before starting, compare this step with the ${project.title} scope and work on the smallest complete example first.`,
    ...input.coreActions,
    "If blocked, write the exact missing input or skill and use the first resource below before changing scope.",
  ];
  const acceleratedActions = [input.coreActions[0], input.coreActions.at(-1)!];
  return {
    id: ids[index],
    title: input.title,
    objective: input.objective,
    actionsBySupport: { GUIDED: guidedActions, STANDARD: input.coreActions, ACCELERATED: acceleratedActions },
    requiredOutput: input.requiredOutput,
    definitionOfDone: input.done,
    estimatedMinutesBySupport: {
      GUIDED: roundQuarterHour(standardMinutes * 1.15),
      STANDARD: standardMinutes,
      ACCELERATED: roundQuarterHour(standardMinutes * 0.85),
    },
    resourcesBySupport: {
      GUIDED: recipeValue.resources,
      STANDARD: FULL_RESOURCE_PROJECT_IDS.has(project.id)
        ? recipeValue.resources
        : recipeValue.resources.slice(0, Math.min(2, recipeValue.resources.length)),
      ACCELERATED: FULL_RESOURCE_PROJECT_IDS.has(project.id) ? recipeValue.resources.slice(0, 2) : recipeValue.resources.slice(0, 1),
    },
    requiredSkills: distinct(splitCsv(project.skills).concat(splitCsv(project.skillTags)))
      .filter((skill) => skill.toLowerCase() !== "none")
      .slice(0, 5),
    submissionRequirementKeys: input.submissionKeys,
    prerequisiteCheckpointIds: input.prerequisites,
    completionMode: input.mode,
  };
}

function guidanceForProject(projectId: string): ProjectGuidance {
  switch (projectId) {
    case "P004":
      return {
        setupActions: [
          "Create the React client, Node/Express API, and PostgreSQL schema using the official stack resources; record supported runtime and database versions.",
          "Create a Render free web service and free Postgres instance, record the 30-day database and spin-down limits, and keep a local PostgreSQL fallback plus seed script.",
          "Configure environment variables, CORS, password hashing, and session or token secrets without committing credentials.",
        ],
        setupDone: [
          "The React client, Node API, and PostgreSQL database run locally from documented commands.",
          "The selected Render free services and their limits are documented, with a local seeded fallback if the free database expires.",
          "Secrets are excluded from source control and auth configuration is ready for negative-path testing.",
        ],
      };
    case "P006":
      return {
        setupActions: [
          "Choose Next.js with Vercel Hobby or Astro with a documented free static host; record the exact free-tier path and keep a local build command as the fallback.",
          "Define routes for home/projects, about/contact, the blog index, and three substantive posts with titles, dates, headings, and original content.",
          "Set mobile, tablet, and desktop breakpoints and create an accessibility and performance checklist before styling.",
        ],
        validationActions: [
          "Test every route and post at 360, 768, and 1280 CSS pixels, including navigation, images, code blocks, focus states, and long text.",
          "Run keyboard, heading, landmark, alt-text, contrast, and form-label checks plus a Lighthouse performance/accessibility pass; record results without claiming certification.",
          "Open the deployed site from a private window, verify all links and three posts, and reproduce the same production build locally from the README.",
        ],
        validationDone: [
          "All required routes and three substantive posts work at the three stated viewport widths.",
          "Keyboard, accessibility, and performance findings are recorded and high-severity defects are resolved or disclosed.",
          "The free-host deployment and documented local production build both open successfully.",
        ],
      };
    case "P014":
      return {
        scopeActions: [
          "Use the UCI Student Performance dataset and record its dataset page, license, files, fields, target definition, retrieval date, and intended educational practice use.",
          "Predict final pass/fail from a threshold stated in advance; exclude G1, G2, identifiers, and sensitive family or demographic fields from model inputs, while retaining permitted fields only for limitations checks.",
          "State that the model is a learning exercise and must not be used for grading, admissions, intervention, or any decision about a real student.",
        ],
        setupActions: [
          "Create a reproducible train/test split before exploration and fit a majority-class or dummy baseline before logistic regression.",
          "Create a data card listing variables, missing values, exclusions, transformations, target balance, license, and known collection limits.",
          "Build a leakage checklist that explicitly rejects target proxies, preprocessing fit on the test set, and conclusions drawn from the full dataset.",
        ],
        validationActions: [
          "Compare baseline and logistic-regression performance on the untouched test set using confusion matrix, precision, recall, F1, and the stated primary metric.",
          "Inspect false positives and false negatives, document coefficient limits, and report subgroup results only where sample size is adequate and never as proof of fairness.",
          "Re-run the notebook from a clean environment and verify that every result and the non-decision disclaimer appears in the report and data card.",
        ],
        validationDone: [
          "Baseline, split, leakage exclusions, test metrics, and error analysis are reproducible.",
          "The report distinguishes association from causation and describes subgroup and sample limitations.",
          "No output recommends or enables a real educational decision about an individual.",
        ],
      };
    case "P019":
      return {
        scopeActions: [
          "Use the UCI Sentiment Labelled Sentences dataset, record its license and three source domains, and reserve a fixed labeled test set before tuning thresholds or display rules.",
          "Define a local Streamlit dashboard with text input, source filter, class distribution, polarity display, example table, and clear empty or invalid-input states.",
          "Treat TextBlob polarity as a rule-based baseline rather than a reliable production classifier and prohibit claims about people, brands, or live customer populations.",
        ],
        setupActions: [
          "Install TextBlob and Streamlit in a pinned environment, save the public dataset metadata, and confirm `streamlit run app.py` starts locally.",
          "Create a majority-class baseline, define the polarity-to-label threshold before evaluation, and document text cleaning that does not leak labels.",
          "Create folders for dashboard code, notebook evaluation, screenshots, error cases, and the final report.",
        ],
        validationActions: [
          "Compare TextBlob with the majority baseline on the fixed labeled set using accuracy, precision, recall, F1, and a confusion matrix.",
          "Review at least 20 errors across negation, sarcasm, mixed sentiment, domain terms, and short text; connect the findings to dashboard warnings.",
          "Test filters, text input, empty data, malformed rows, and local startup from a clean clone, then capture the required dashboard screenshots.",
        ],
        validationDone: [
          "The dashboard runs locally from documented commands and exposes every promised interaction.",
          "The fixed-set baseline comparison and error categories are reproducible.",
          "The interface and report label rule-based limitations and make no live-population performance claim.",
        ],
      };
    case "P022":
      return {
        scopeActions: [
          "Use the UCI Adult benchmark through a documented Fairlearn-compatible retrieval path; record the license, target, protected attributes used only for auditing, and retrieval date.",
          "Train a simple logistic-regression benchmark and define demographic-parity and equalized-odds measures with a written rationale before examining group results.",
          "State that the historic benchmark contains social bias, is not representative of current populations, and may not be used for employment, credit, benefit, or individual decisions.",
        ],
        setupActions: [
          "Pin Python, scikit-learn, and Fairlearn versions; create a fixed split and a model card with features, exclusions, target, preprocessing, and known historical limitations.",
          "Set a minimum reportable subgroup size of 30, include intersections only when that threshold is met, and plan bootstrap intervals or another stated uncertainty method.",
          "Define one post-processing or threshold mitigation experiment and the utility and fairness metrics that will be compared before and after it.",
        ],
        validationActions: [
          "Report overall performance plus group metrics and uncertainty, suppress groups below the threshold, and avoid ranking protected groups as inherently better or worse.",
          "Compare the unmitigated and mitigated model on the same test data, explaining fairness-performance trade-offs and why no metric proves fairness.",
          "Re-run the audit from a clean environment and verify the report contains dataset history, intersectional limitations, non-decision boundary, and reproducible tables.",
        ],
        validationDone: [
          "The model, fairness metrics, uncertainty method, and mitigation comparison reproduce from the repository.",
          "Small subgroups are suppressed and historical and intersectional limitations are explicit.",
          "The audit makes no claim that the model is fair or suitable for a real decision system.",
        ],
      };
    case "P023":
      return {
        scopeActions: [
          "Use one named CDC PLACES County Data release and record the release year, data dictionary, measure IDs, population, geography, source URL, and retrieval date.",
          "Select two prevalence measures and one contextual measure, state their denominators and age-adjustment status, and define one descriptive county-level question.",
          "Prohibit individual, clinical, causal, and program-effectiveness conclusions; county correlations are ecological associations only.",
        ],
        setupActions: [
          "Save the raw extract and a source log, retain the location and measure identifiers, and map every coded field through the CDC dictionary.",
          "Define missing, suppressed, unreliable, and duplicate-value handling plus inclusion rules before calculating summaries.",
          "Create a cleaning notebook that preserves raw values, produces a tidy analysis table, and logs every exclusion and unit transformation.",
        ],
        validationActions: [
          "Reconcile row counts and selected county values with the CDC portal, check denominators and age-adjustment flags, and document suppressed or missing values.",
          "Run sensitivity checks for outliers and measure selection; label correlations as non-causal and describe ecological and collection limits.",
          "Re-run the notebook from raw data and verify every number in the one-page summary traces to a saved table or chart.",
        ],
        validationDone: [
          "Release, measures, population, denominators, geography, and exclusions are traceable to CDC documentation.",
          "All reported values reproduce and missing or suppressed records are handled explicitly.",
          "The summary contains no individual, clinical, or causal inference.",
        ],
      };
    case "P027":
      return {
        scopeActions: [
          "Use a versioned seeded generator for 2,000 synthetic visitors randomly assigned 1:1 to control or treatment, with one binary conversion outcome and no real customer data.",
          "Pre-register the primary hypothesis, two-sided alpha, minimum practical effect, primary outcome, sample size, and decision rule before generating results.",
          "State that causal language applies only to the synthetic randomized case and does not establish a real marketing effect.",
        ],
        setupActions: [
          "Commit the random seed and generator, create a data dictionary, and verify assignment precedes outcome generation with no post-treatment features.",
          "Plan balance checks, conversion-rate difference, confidence interval, effect size, and one stated two-proportion hypothesis test.",
          "Define missing-data and multiple-comparison rules; the core conclusion must rely only on the pre-registered primary outcome.",
        ],
        validationActions: [
          "Check allocation ratio and pre-treatment balance, then report group counts, rates, absolute and relative lift, confidence interval, p-value, and practical significance.",
          "Run a null-effect seed as a negative control and one sample-size sensitivity; do not treat a non-significant result as proof of no effect.",
          "Re-run generation and analysis from a clean checkout and confirm the memo labels all observations as synthetic and bounded to the simulated experiment.",
        ],
        validationDone: [
          "The seeded data, allocation checks, primary test, interval, and effect size reproduce exactly.",
          "The decision follows the pre-registered outcome and practical threshold rather than p-value alone.",
          "No result is represented as evidence about an actual campaign or population.",
        ],
      };
    case "P028":
      return {
        scopeActions: [
          "Use OpenML dataset 42178 (Telco Customer Churn), record the dataset version, license shown by the source, field definitions, target, and retrieval date.",
          "Exclude customerID and any post-outcome or target-derived field, define churn as the published target, and choose a fixed stratified train/test split.",
          "Frame recommendations as hypotheses informed by associations, not causal claims about retention interventions.",
        ],
        setupActions: [
          "Create a data card with class balance, missing and blank TotalCharges handling, categorical encoding, exclusions, and split strategy.",
          "Fit a dummy baseline before a simple interpretable classifier and choose the primary metric based on the stated business error costs.",
          "Keep preprocessing inside a pipeline fit only on training data and record class weighting or resampling, if used, without touching the test labels.",
        ],
        validationActions: [
          "Compare the model with the dummy baseline on the untouched test set using the primary metric, confusion matrix, precision, recall, ROC-AUC, and calibration caveats.",
          "Review false positives and false negatives, test the impact of class weighting, and distinguish model importance from causal drivers.",
          "Re-run the repository from a clean environment and trace each executive recommendation to a documented analysis result and limitation.",
        ],
        validationDone: [
          "Dataset identity, split, leakage controls, baseline, model metrics, and error review are reproducible.",
          "Class imbalance and the selected business error trade-off are handled explicitly.",
          "Recommendations are bounded hypotheses and do not claim an intervention will cause lower churn.",
        ],
      };
    case "P029":
      return {
        scopeActions: [
          "Use a named EPA Emission Factors Hub release and record factor year, geography, source table, gas or CO2e basis, units, and retrieval date for electricity, vehicle fuel, and one optional household category.",
          "Define the activity inputs, unit conversions, system boundary, output period, and uncertainty note; do not present the result as a complete life-cycle footprint.",
          "Require an editable workbook, methodology, factor log, worked example, and visible formula checks.",
        ],
        validationActions: [
          "Independently hand-calculate one example in each category and reconcile it with the workbook, including every unit conversion.",
          "Test blank, zero, negative, extreme, and unit-change inputs; prevent invalid entries and confirm totals update without hard-coded values.",
          "Verify every factor traces to its EPA table and year, uncertainty and exclusions are visible, and the editable template and methodology are both packaged.",
        ],
        validationDone: [
          "Each factor has a year, geography, unit, source, and retrieval date.",
          "Worked examples, formula checks, and invalid-input tests pass without hard-coded totals.",
          "The methodology states the boundary, omissions, and that outputs are estimates rather than certified inventories.",
        ],
      };
    case "P036":
      return {
        scopeActions: [
          "Create five fictional RFC 5322 email fixtures using example.com and RFC 5737 TEST-NET IP addresses only; do not collect, open, forward, or click a live suspicious email, link, or attachment.",
          "Include documented examples of display-name spoofing, reply-to mismatch, Received-chain anomalies, and fictional SPF/DKIM/DMARC results without using a real person's data.",
          "Define confidence labels and a rule that an indicator is evidence, not proof of malicious intent, unless corroborated within the synthetic fixture.",
        ],
        setupActions: [
          "Store fixtures as inert text with non-clickable reserved-domain URLs and scan them to confirm there are no active attachments, credentials, personal data, or routable indicators.",
          "Create an annotation template for header field, observation, interpretation, provenance, confidence, alternative explanation, and recommended defensive follow-up.",
          "Use RFC and NIST guidance for message structure and authentication interpretation, and record every reference in the repository.",
        ],
        validationActions: [
          "Trace each annotation to exact header lines, explain SPF, DKIM, DMARC, and Received-chain limits, and separate observed facts from conclusions.",
          "Run a safety check that every domain and IP is reserved, all screenshots are redacted, and no live link or attachment is opened or included.",
          "Have the report reproduce at least one benign-looking and one suspicious fixture analysis with confidence and plausible alternative explanations.",
        ],
        validationDone: [
          "All fixtures are synthetic, inert, and limited to reserved domains and documentation addresses.",
          "Every finding has exact header evidence, provenance, confidence, and an alternative explanation.",
          "The repository contains no live suspicious content, credentials, personal data, or actionable target information.",
        ],
      };
    case "P038":
      return {
        scopeActions: [
          "Use only traffic generated on the student's own isolated local machine or a clearly documented Wireshark sample capture; never capture a shared, school, employer, public, or other person's network traffic.",
          "Define two bounded protocol questions such as DNS resolution plus TCP/HTTP behavior, and record capture provenance, interface, time boundary, and expected protocol sequence.",
          "Prohibit credentials and personal data; if a public sample contains sensitive payloads, choose another capture rather than redistributing them.",
        ],
        setupActions: [
          "Install Wireshark, record its version, and capture a short student-owned loopback or isolated-lab session with a documented start and stop condition.",
          "Create a filter log containing purpose, display-filter expression, matching frame numbers, expected behavior, and interpretation confidence.",
          "Save raw captures separately from sanitized screenshots and report evidence, and hash or identify each submitted PCAP for traceability.",
        ],
        validationActions: [
          "Use frame numbers and timestamps to reconstruct each protocol sequence and verify claims against the relevant Wireshark protocol fields.",
          "Test each saved display filter, compare expected and observed behavior, and label retransmissions, errors, or anomalies without calling them attacks absent evidence.",
          "Inspect the final PCAPs and screenshots for credentials, cookies, tokens, personal data, unrelated-user traffic, and undocumented provenance before submission.",
        ],
        validationDone: [
          "Every submitted capture has an authorized origin, bounded time window, and provenance record.",
          "Each claim cites working filters and exact frame evidence with uncertainty stated.",
          "No credential, personal, shared-network, or unrelated-user traffic is present.",
        ],
      };
    case "P039":
      return {
        scopeActions: [
          "Define a two-input binary calculator width, supported arithmetic and logic operations, signed or unsigned convention, carry, overflow, divide-by-zero or invalid-operation behavior, and output representation.",
          "Create a truth table and required edge-case table before coding, including zero, maximum value, carry, overflow, invalid opcode, and every supported operation.",
          "Choose simulation-only as the guaranteed path using EDA Playground or Verilator; physical FPGA evidence remains optional.",
        ],
        buildActions: [
          "Implement modular HDL for inputs, operation selection, arithmetic or logic unit, status flags, and output display or simulation signals.",
          "Write a self-checking testbench that covers the truth table, normal cases, boundaries, invalid operations, carry, and overflow and exits nonzero on a mismatch.",
          "Save waveform or textual test evidence, the schematic, and synthesis or timing output when the free tool supports it; label unsupported hardware timing claims.",
        ],
        validationActions: [
          "Run the complete self-checking testbench from a clean simulation and preserve the pass/fail log plus representative waveforms.",
          "Compare observed results with the prewritten truth and edge-case tables, correcting every mismatch before recording the demo.",
          "If synthesis is available, record resource and timing output; otherwise state that functional simulation does not establish board timing or electrical behavior.",
        ],
        validationDone: [
          "The automated testbench passes every operation and required boundary or invalid case.",
          "Waveforms or logs and the schematic match the HDL and truth table.",
          "Synthesis/timing evidence is included when available and limitations are explicit when it is not.",
        ],
      };
    case "P040":
      return {
        scopeActions: [
          "Choose the guaranteed Wokwi path using a potentiometer as simulated soil moisture and an LED as the pump/valve output; a physical Arduino, low-voltage sensor, and isolated actuator are optional.",
          "Define dry and wet thresholds, hysteresis, sampling interval, maximum run time, manual override, disconnected-sensor behavior, and a fail-safe output state before coding.",
          "For optional hardware, prohibit mains voltage and require USB or approved extra-low-voltage power, water separation, a protected driver, supervised tests, and no unattended pump operation.",
        ],
        setupActions: [
          "Create the Wokwi simulation and verify sensor input, serial logging, status output, and actuator indicator; record a zero-cost simulation BOM.",
          "If building hardware, add the exact board, sensor, driver, diode, tubing, enclosure or splash protection, low-voltage supply, estimated cost, and available source to a separate BOM.",
          "Create a calibration table and test plan for dry, wet, threshold bounce, disconnected sensor, stuck sensor, reset, manual override, and maximum-run timeout.",
        ],
        validationActions: [
          "Run the calibration and every fault test, recording input, expected state, observed state, response time, and pass/fail result.",
          "Verify hysteresis prevents rapid switching and disconnected or implausible sensor values force the safe output state.",
          "For any physical build, inspect water/electrical separation and current-driving protection before a supervised short run; otherwise make no physical-performance claim.",
        ],
        validationDone: [
          "The simulation is freely reproducible and demonstrates thresholds, hysteresis, override, timeout, and sensor-fault behavior.",
          "The schematic and BOM match the selected simulation or optional hardware path.",
          "Any physical test follows the low-voltage, water-separation, supervision, and fail-safe rules.",
        ],
      };
    case "P047":
      return {
        scopeActions: [
          "Use a non-isolated buck converter simulation with an explicit simplified PV source curve and a 12 V nominal battery equivalent model; state voltage, current, irradiance proxy, and battery-state assumptions.",
          "Implement and name either perturb-and-observe MPPT or a bounded PWM control method, including duty-cycle limits, switching frequency, component ratings, and protection assumptions.",
          "Define required sweeps for source irradiance or input voltage, battery voltage, load, startup, and one component tolerance plus targets for efficiency, ripple, and stress.",
        ],
        setupActions: [
          "Install LTspice, run the official getting-started example, and create parameterized source, battery, switch, diode, inductor, capacitor, and load models with cited or clearly labeled assumed values.",
          "Create separate operating-point, transient, sweep, efficiency, ripple, and component-stress plots and save every simulation directive in the native schematic.",
          "Add an assumptions table with model limits, initial conditions, sign conventions, and a statement that simulation is not a safety-certified charger design.",
        ],
        validationActions: [
          "Sweep the source and battery operating range and show controller convergence, duty limits, charging current, output ripple, and behavior outside the feasible conversion region.",
          "Calculate input and output average power consistently, report simulated efficiency, and compare switch, diode, inductor, and capacitor stresses with stated model ratings.",
          "Run startup and tolerance cases, resolve numerical or control instability, and state model omissions such as thermal, parasitic, battery-management, and hardware-protection behavior.",
        ],
        validationDone: [
          "The topology, source, battery, controller, operating range, and assumptions are explicit and reproducible.",
          "Sweeps record MPPT or PWM behavior, efficiency, ripple, startup, and component stresses.",
          "The report does not claim the simulated circuit is a deployable or safety-certified charger.",
        ],
      };
    case "P007":
      return {
        setupActions: [
          "Create the Node.js and Express API, add JWT authentication, and pin the supported runtime and package versions.",
          "Define the OpenAPI contract, import it into Postman, and create success, validation, unauthorized, and not-found requests.",
          "Configure a Render free web service, document spin-down limits, and preserve a local run command as the no-cost fallback.",
        ],
        setupDone: [
          "Express starts locally and the authentication secret is supplied through an uncommitted environment variable.",
          "The OpenAPI contract loads in Postman and includes auth and error responses.",
          "The free hosting path and local fallback are both documented and reproducible.",
        ],
      };
    case "P048":
      return {
        scopeActions: [
          "Choose student-recorded audio or audio carrying a license that permits modification and portfolio redistribution; do not use unlicensed commercial recordings.",
          "Record the creator, source URL or recording date, license, attribution text, and redistribution limits before processing the audio.",
          "Use one mono PCM WAV at 44.1 kHz, resampling once if necessary, and compare a windowed linear-phase FIR low-pass filter with a Butterworth IIR low-pass filter against the same 3 kHz passband edge, 4 kHz stopband edge, no more than 1 dB passband ripple, and at least 30 dB stopband attenuation.",
        ],
        setupActions: [
          "Install GNU Octave and its signal package as the guaranteed free path or document available MATLAB access, then run an audio read/write, FFT, filter-design, and freqz smoke test.",
          "Save the untouched source audio and rights record, then create a documented preprocessing step that converts to mono 44.1 kHz PCM without clipping and records original and processed sample rates, duration, peak level, and RMS level.",
          "Create folders for source code, original audio, processed audio, frequency-response plots, FFT and waveform comparisons, validation tables, and final submission files.",
        ],
        setupDone: [
          "Octave or MATLAB reads, resamples when needed, transforms, and writes the selected audio while the signal-package filter and freqz functions run successfully.",
          "The source/license record proves the audio may be modified and redistributed in the portfolio package.",
          "The normalized mono 44.1 kHz working file has recorded duration, peak, RMS, and clipping checks and remains separate from the original.",
        ],
        buildActions: [
          "Design the FIR and Butterworth IIR filters from the fixed passband and stopband contract, record order, coefficients, normalization, and phase behavior, and apply both to the same normalized audio without overwriting the original.",
          "Export before, FIR-after, and IIR-after audio plus magnitude response, phase or group-delay, waveform, and FFT plots with labeled axes, units, and the 3 kHz and 4 kHz boundaries.",
          "Create a comparison table for measured passband ripple, stopband attenuation, peak level, RMS level, clipping count, runtime or filter order, and listening observations without treating listening as the acceptance test.",
        ],
        buildDone: [
          "Both filter designs, coefficients, source audio, processed audio, and plotting code reproduce from a clean run.",
          "Plots and the comparison table use the same audio segment, sample rate, amplitude convention, and frequency boundaries.",
          "No output clips, and any gain normalization is documented and applied consistently.",
        ],
        validationActions: [
          "Measure each design with freqz on a dense frequency grid and verify passband ripple at or below 1 dB and stopband attenuation at or above 30 dB; if a design misses, revise its order and rerun the complete check.",
          "Confirm the exported audio remains 44.1 kHz with the original duration, contains no NaN or infinite samples or absolute amplitude above 1.0, and report before-and-after peak, RMS, and FFT-band energy below 3 kHz and above 4 kHz.",
          "Run the workflow from the untouched source file, compare FIR linear-phase delay with IIR phase behavior, and state that the measurements demonstrate this selected clip and specification rather than universal audio quality.",
        ],
        validationDone: [
          "Both filters meet the fixed ripple and attenuation targets or a documented failed design is corrected and retested.",
          "Sample rate, duration, clipping, peak, RMS, and two-band FFT energy checks reproduce for all three audio files.",
          "The report explains the FIR/IIR order, phase, and audible trade-offs without relying on subjective listening as proof.",
        ],
      };
    case "P051":
      return {
        scopeActions: [
          "Use FreeCAD as the guaranteed free tool and define phone envelope, viewing angle, charging clearance, base footprint, minimum wall thickness, stability, and export requirements; printing is optional.",
          "Plan three dimensioned iterations: a baseline, a stability or clearance revision, and a final print-ready revision, each tied to a recorded requirement or failed check.",
          "Define evidence as native FreeCAD source, STL, labeled renders or screenshots for all iterations, and a rationale; never require printer access or claim physical performance without a print test.",
        ],
        setupActions: [
          "Install FreeCAD, create a dimensioned test solid, export and re-import an STL, and record software version and mesh/export settings.",
          "Create a requirements and iteration table with dimensions, decision, predicted benefit, trade-off, and validation result.",
          "Create folders for native CAD, exports, iteration evidence, checks, optional print photos, and final rationale.",
        ],
        validationActions: [
          "Check the final model against the phone envelope, viewing angle, charging clearance, base contact, wall thickness, overhang assumptions, and manifold STL export.",
          "Compare all three iterations using the same dimensioned views and explain the requirement or failed check that justified each change.",
          "Reopen the native file and imported STL in FreeCAD; if no print was made, label stability and manufacturability conclusions as CAD-based predictions.",
        ],
        validationDone: [
          "The native model and STL reopen successfully and satisfy the stated dimension and clearance checks.",
          "Three labeled iterations show distinct evidence-linked decisions.",
          "Physical claims appear only when supported by optional print evidence; otherwise limits are explicit.",
        ],
      };
    case "P052":
      return {
        scopeActions: [
          "Model the fixed Intrnd practice frame as six fused circular steel tubes using these centerline nodes in millimeters: rear dropout (0,0), bottom bracket (420,0), seat cluster (430,520), lower head (900,420), and upper head (850,600); connect rear-bottom, rear-seat, bottom-seat, bottom-lower-head, seat-upper-head, and lower-to-upper-head with 28 mm outside diameter and 2 mm wall thickness.",
          "Use a linear-elastic practice material with elastic modulus 200 GPa, Poisson ratio 0.30, and yield strength 250 MPa; fully restrain the rear-dropout support face, restrain only vertical and out-of-plane motion at the lower-head support face, and apply a 1,000 N downward distributed load at the seat-cluster face in SI units.",
          "Treat this as a pedagogical static load case, not an ISO bicycle test or safety certification, and set practice review targets of reaction imbalance at or below 2 percent, mesh-change in displacement at or below 5 percent, representative stress change at or below 10 percent, displacement at or below 5 mm, and representative safety factor at or above 1.5.",
        ],
        setupActions: [
          "Create the fixed five-node, six-member hollow-tube geometry in FreeCAD, fuse or join the members, export a STEP file in millimeters, and document the FreeCAD version and every geometry simplification.",
          "Choose SimScale Community as the guaranteed free solver path or document Ansys Student access, then record public-project and mesh/node limits.",
          "Import a simple FreeCAD tube into the solver, assign the fixed practice-steel properties, support conditions, and 1,000 N load, run a smoke test, and save native project evidence and a completion screenshot.",
        ],
        setupDone: [
          "The dimensioned fixed geometry exports from FreeCAD and imports successfully into SimScale Community or Ansys Student in millimeters.",
          "The selected free tier, privacy model, and solver/model limits are documented.",
          "A trivial completed solve proves the material, units, support, load, and CAD-to-FEA route before the complete frame solve begins.",
        ],
        buildActions: [
          "Create a linear-static study using the fixed geometry, material, component units, support faces, and distributed 1,000 N seat load; preserve named selections or screenshots that make every boundary condition reviewable.",
          "Run an initial second-order tetrahedral mesh with an approximately 20 mm global size, then a refined approximately 10 mm mesh while keeping geometry, contacts, loads, and constraints unchanged.",
          "Export displacement and von Mises stress maps, total reactions, mesh statistics, a representative stress probe at least one tube diameter from each support or junction singularity, and the calculated representative safety factor.",
        ],
        buildDone: [
          "The native project reproduces both mesh runs from the fixed geometry, material, load, and constraints.",
          "Displacement, stress, reactions, mesh counts, representative probes, and safety-factor calculations are preserved in SI units.",
          "Raw singular peaks are separated from the representative stress used for the practice safety factor.",
        ],
        validationActions: [
          "Confirm the summed vertical reactions balance the 1,000 N applied load within 2 percent and that unintended horizontal reaction is explained or corrected.",
          "Compare coarse and refined meshes: require maximum displacement change at or below 5 percent and representative stress change at or below 10 percent, excluding raw constraint or junction singularities from the convergence claim.",
          "Report pass or fail against the 5 mm displacement and 1.5 representative safety-factor practice targets, revise one tube dimension if a target fails, rerun both checks, and state that the result is not a roadworthy design or bicycle-standard certification.",
        ],
        validationDone: [
          "Geometry, steel properties, SI units, support components, and the 1,000 N load match the fixed practice case.",
          "Reaction balance and mesh-change thresholds pass, or the correction and complete retest are documented.",
          "Displacement and representative safety-factor targets receive an explicit pass or fail and no roadworthiness or certification claim is made.",
        ],
      };
    case "P057":
      return {
        scopeActions: [
          "Choose only a student-controlled indoor area or a low-risk site with written owner or campus permission; never enter restricted, active-construction, roadway, roof, or utility areas.",
          "Define a two-person or check-in field plan, daylight/weather limits, stop-work conditions, and the measurements that can be taken without ladders or intrusive tools.",
          "Plan photographs to exclude faces, addresses, license plates, access credentials, and private interiors not covered by permission.",
        ],
        setupActions: [
          "Install FreeCAD or LibreCAD and confirm it can create a scaled drawing and export PDF without a paid license.",
          "Save the site permission or student-control attestation, field safety checklist, photo plan, and measurement sheet before visiting the site.",
          "Create separate folders for private raw photos, privacy-safe portfolio photos, CAD source, and final documents.",
        ],
        setupDone: [
          "The free CAD tool opens, creates a scaled test shape, and exports a readable PDF.",
          "Site authorization and the field safety/check-in plan are documented before measurements begin.",
          "The photo plan excludes personal, identifying, security, and unauthorized interior information.",
        ],
        buildActions: [
          "Measure a small closed boundary using a baseline and offsets or two independent dimension paths; record instrument, units, repeated readings, and a stated tolerance.",
          "Draft the plan in FreeCAD or LibreCAD with drawing units, scale, dimensions, layers or line types, north or orientation note, title block, and revision date.",
          "Keep raw field notes and private photos separate from the privacy-safe plan, photo set, permission/safety note, and methodology package.",
        ],
        validationActions: [
          "Repeat at least two critical dimensions and perform a closure or independent total-length check against the stated tolerance.",
          "Verify drawing scale, units, dimensions, orientation, line weights, labels, title block, and PDF legibility in both native CAD and export.",
          "Reconcile every plan dimension to the field sheet and remove identifying or unauthorized content from the portfolio evidence.",
        ],
        validationDone: [
          "Repeated and closure checks meet the stated tolerance or the discrepancy is documented and corrected.",
          "The editable CAD and plan PDF agree on scale, units, dimensions, and revision information.",
          "Permission, safety, method, and privacy-safe evidence are complete and no restricted-site activity occurred.",
        ],
      };
    case "P059":
      return {
        scopeActions: [
          "Use the bounded fictional project: a 10-week small office fit-out with design, procurement, demolition, framing, MEP rough-in, finishes, inspection, and handover activities.",
          "Define durations, predecessors, calendars, milestones, one constrained trade resource, and the assumptions that determine the critical path.",
          "Require the editable ProjectLibre file, exported schedule PDF, and narrative so reviewers can inspect both logic and presentation.",
        ],
        setupActions: [
          "Install ProjectLibre from the official source and create a test project with finish-to-start and start-to-start dependencies.",
          "Configure the project calendar, working days, milestones, and resource sheet before entering the fictional case.",
          "Create folders for the editable schedule, PDF exports, logic checks, and final narrative.",
        ],
        setupDone: [
          "ProjectLibre opens and recalculates a test critical path after a duration change.",
          "The calendar, dependency types, milestones, and resource fields are visible in the editable file.",
          "Native, exported, validation, and final files have distinct locations.",
        ],
        validationActions: [
          "Inspect every activity for a predecessor and successor except justified start/end milestones, then resolve open ends and circular logic.",
          "Record the critical path, total float, one resource conflict, and the before/after effect of the chosen leveling decision.",
          "Reopen the submitted native file and confirm its logic matches the exported PDF and narrative.",
        ],
      };
    case "P061":
      return {
        scopeActions: [
          "Use the fictional case provided here: a 20-by-30-foot room, 10-foot walls, one 3-by-7-foot door, two 4-by-4-foot windows, and one 20-foot interior partition.",
          "Take off floor finish, net wall-paint area, baseboard, and partition length using illustrative unit costs of $6/sf, $1.50/sf, $4/lf, and $45/lf respectively.",
          "Label every case dimension and unit cost as an Intrnd practice assumption rather than current market data, and require editable markup and formulas.",
        ],
        setupActions: [
          "Install LibreOffice Draw and Calc, recreate the fictional plan to scale, and confirm both editable files save and reopen.",
          "Create a source log identifying the provided dimensions and illustrative unit costs, with fields for quantity, unit, waste factor, unit cost, and extension.",
          "Create folders for plan source, markup, takeoff workbook, formula checks, and final memo.",
        ],
        setupDone: [
          "The fictional drawing is dimensioned and opens in LibreOffice Draw.",
          "The Calc workbook contains traceable formulas and clearly labels costs as illustrative practice assumptions.",
          "Plan, markup, workbook, validation, and final files have distinct locations.",
        ],
        validationActions: [
          "Recalculate each quantity independently, check unit conversions, and verify openings are deducted only where appropriate.",
          "Test zero, waste-factor, and unit-cost changes to confirm formulas update without hard-coded totals.",
          "Reopen the submitted editable files and reconcile the markup quantities to the workbook and memo.",
        ],
      };
    case "P063":
      return {
        scopeActions: [
          "Choose one U.S. public company and set a single valuation date; use SEC filings for financials, Nasdaq for dated market price, Treasury for the risk-free rate, and NYU Damodaran for ERP or industry beta assumptions.",
          "Record source URL, publication date, retrieval date, units, fiscal period, and any transformation for every valuation input.",
          "Define the forecast horizon, WACC convention, terminal-value method, share-count treatment, and base/upside/downside cases before modeling.",
        ],
        setupActions: [
          "Download the latest annual filing and subsequent quarterly filing, then build a dated source log for price, debt, cash, shares, Treasury rate, ERP, beta, and tax rate.",
          "Create an editable spreadsheet with separate inputs, historicals, forecast, DCF, sensitivity, and audit-check sections.",
          "Add checks for balance consistency, sign conventions, discount periods, terminal-value share, and enterprise-to-equity bridge.",
        ],
        setupDone: [
          "Every key valuation input has an authoritative source, as-of date, unit, and documented transformation.",
          "The model separates sourced inputs from formulas and contains visible audit checks.",
          "The valuation date and filing periods are internally consistent.",
        ],
        validationActions: [
          "Audit forecast links, WACC inputs, discount periods, terminal value, enterprise-to-equity bridge, diluted share count, and sign conventions against the dated source log.",
          "Run base, upside, downside, WACC, and terminal-growth sensitivities and identify the assumptions driving the valuation range without presenting investment advice.",
          "Reconcile every number in the deck and memo to the submitted editable model and reopen all source links as of the stated valuation date.",
        ],
        validationDone: [
          "Visible checks cover model links, valuation bridge, discounting, terminal value, and share count.",
          "Scenario and sensitivity outputs are model-driven and the main decision drivers are explained.",
          "The editable model, deck, memo, and source log agree and are explicitly educational analysis rather than investment advice.",
        ],
      };
    case "P066":
      return {
        scopeActions: [
          "Choose one U.S. public company and three to five peers using a written business-model, geography, size, and reporting-period rule.",
          "Use SEC filings for reported fundamentals and dated Nasdaq prices; calculate simple trailing multiples directly and do not use unsupported analyst estimates.",
          "Record every ticker, source URL, fiscal period, price date, unit, and peer inclusion or exclusion reason.",
        ],
        setupActions: [
          "Download current filings and capture same-date public prices for the subject and peers.",
          "Create an editable comps sheet that reconciles debt, cash, diluted shares, enterprise value, and trailing metrics from cited sources.",
          "Add checks for currency, units, fiscal-period comparability, negative denominators, outliers, and stale prices.",
        ],
        setupDone: [
          "Each peer has dated price and filing evidence plus a documented selection rationale.",
          "Every multiple is reproducible from cited public inputs rather than copied from an opaque screen.",
          "Unit, currency, period, and outlier checks are visible in the model.",
        ],
        buildActions: [
          "Build the directly sourced comp table and a ten-slide pitch containing company context, thesis, valuation, two catalysts, disconfirming evidence, bear case, risks, and a bounded conclusion.",
          "Create a one-page memo that distinguishes sourced facts, calculated values, assumptions, and judgment and references the dated source log.",
          "Link every displayed multiple and valuation range to the editable model rather than retyping numbers into the deck.",
        ],
        validationActions: [
          "Recalculate enterprise value and each multiple, review negative denominators and outliers, and compare periods, currencies, and price dates consistently.",
          "Pressure-test the thesis with at least two disconfirming facts and a bear scenario, then confirm catalysts and risks are evidence-backed rather than promotional.",
          "Reconcile every deck and memo number with the model and verify the source log supports every peer, filing, price, and major thesis claim.",
        ],
        validationDone: [
          "The comp model is reproducible from dated public inputs with visible unit and period checks.",
          "The thesis includes catalysts, disconfirming evidence, bear case, and material risks.",
          "Deck, memo, model, and source log agree and make no investment-performance promise.",
        ],
      };
    case "P070":
      return {
        scopeActions: [
          "Use the fixed security Apple Inc. 4.45% Notes due May 6, 2044, CUSIP 037833AT7, with the SEC-filed offering terms and indenture plus Apple 10-K/10-Q filings available as of one fixed analysis date.",
          "Define the credit question, debt seniority, covenant scope, comparison set, rating framework, and downside horizon without relying on a paid terminal or unsupported bond quote.",
          "Confirm whether the note remains outstanding on the analysis date; if current status cannot be verified, present it explicitly as a historical practice case and make no current trading claim.",
        ],
        setupActions: [
          "Download the SEC offering terms and indenture plus the 10-K and 10-Q selected for the analysis date, save exact page citations, and use FINRA data only when a public observation is available on that date.",
          "Create an editable model for debt, cash, liquidity, interest expense, EBITDA or cash-flow proxy, coverage, leverage, maturities, and a simple downside case with stated definitions.",
          "Create a covenant table with exact document language, page, threshold, applicability, and interpretation limits rather than assuming standard protections.",
        ],
        validationActions: [
          "Reconcile debt, cash, interest, and cash-flow inputs to filings; recalculate leverage and coverage and test a documented revenue or margin downside scenario.",
          "Check maturity concentration, liquidity sources and uses, covenant citations, seniority, and rating-method comparison, distinguishing issuer credit from bond-price performance.",
          "Reopen every public source and model formula, then verify the memo identifies data gaps and does not offer investment advice or an unsupported rating.",
        ],
        validationDone: [
          "The named security, SEC documents, issuer filings, covenant citations, and as-of date are traceable.",
          "Debt stack, liquidity, coverage, maturities, downside case, and comp calculations reproduce from the editable model.",
          "The memo states limits and makes no investment recommendation or unsupported market-price claim.",
        ],
      };
    case "P071":
      return {
        scopeActions: [
          "Create an entirely fictional brand, product, logo, audience, and launch context; include an unaffiliated practice disclaimer on the brief and every presentation asset.",
          "Do not use a real brand's trademarks, impersonate an organization, contact customers, publish the campaign as live work, or claim access to platform analytics.",
          "Define channel specifications, accessibility requirements, a hypothetical KPI framework, and an offline preference or clarity test that is not presented as an A/B campaign result.",
        ],
        buildActions: [
          "Produce the campaign brief, three channel-sized Canva assets, accessible text alternatives, content calendar, and hypothetical KPI framework for the fictional audience.",
          "Label every target, benchmark, and expected outcome as an assumption and document the formula or rationale behind it.",
          "Create an offline test plan covering variant, question, success criterion, sample limitation, and how a future real campaign would require authorization and actual data.",
        ],
        validationActions: [
          "Check channel sizes, legibility, color contrast, captions or alt text, calendar consistency, audience-message fit, and disclaimer visibility.",
          "Run only a qualitative peer clarity review or offline mock evaluation and label it separately from performance, conversion, or A/B evidence.",
          "Remove all real-client, live-campaign, measured-result, and guaranteed-performance language from the final package.",
        ],
        validationDone: [
          "The brand and campaign are clearly fictional and unaffiliated on every artifact.",
          "Assets meet the stated channel and accessibility criteria and the calendar matches the brief.",
          "KPIs and tests are explicitly hypothetical and no live outcome is claimed.",
        ],
      };
    case "P076":
      return {
        scopeActions: [
          "Choose one public consumer brand and three competitors using a written category, geography, and audience rule; treat the work as unaffiliated desk research only.",
          "Use a fixed evidence matrix covering brand promise, target audience, points of parity, points of difference, reasons to believe, tone, and visual codes.",
          "Fix a retrieval date and source hierarchy: official public brand artifacts first, then credible third-party reporting and clearly labeled consumer observations; no insider or performance claims.",
        ],
        setupActions: [
          "Create a dated source log with URL, artifact type, observed fact, interpretation, and limitation for the target and each competitor.",
          "Create the evidence matrix and a recommendation table linking every proposed position change to at least two independent observations.",
          "Define competitor selection, audience, geography, exclusions, and the difference between observed evidence and strategic judgment.",
        ],
        validationActions: [
          "Trace every audit claim and recommendation to the evidence matrix, remove uncited generalizations, and label interpretation separately from fact.",
          "Test the repositioning against each competitor, counterevidence, audience fit, implementation burden, brand continuity, and trademark or affiliation risk.",
          "Verify the report contains the unaffiliated disclaimer, retrieval dates, selection method, limitations, and no claim of internal brand access or measured market impact.",
        ],
        validationDone: [
          "Every major observation and recommendation traces to dated public evidence.",
          "Competitor selection and the evidence matrix are consistent and counterevidence is addressed.",
          "The audit is explicitly unaffiliated and contains no insider, live-performance, or guaranteed outcome claim.",
        ],
      };
    case "P079":
      return {
        scopeActions: [
          "Use the fixed decision: should a fictional small HVAC service company enter residential heat-pump retrofit services in one selected U.S. state over the next three years?",
          "Define homeowner and small-landlord segments, service boundary, geography, as-of date, decision criteria, and source hierarchy using DOE, EIA, Census, SBA, state-program, and credible competitor sources.",
          "Require top-down and bottom-up sizing, competitor structure, customer and channel evidence, three scenarios, alternatives, implementation risks, and an annotated bibliography.",
        ],
        setupActions: [
          "Build a source ledger with publication and retrieval dates, definitions, geography, units, quality, conflicts, and intended use for each figure.",
          "Create a sizing workbook that reconciles households, heating-system eligibility, adoption assumptions, serviceable share, jobs, capacity, and revenue without double counting.",
          "Select at least five competitors or substitutes using a written rule and create base, upside, and downside assumptions before writing the recommendation.",
        ],
        validationActions: [
          "Reconcile top-down and bottom-up estimates, test the three highest-impact assumptions, and explain unresolved differences rather than averaging them away.",
          "Pressure-test competition, workforce capacity, customer acquisition, seasonality, incentives, technology alternatives, and regulatory or program changes.",
          "Audit every quantitative claim against the source ledger and verify the report, slides, workbook, and bibliography use the same scope and as-of date.",
        ],
        validationDone: [
          "The defined decision, state, segment, horizon, and service boundary remain consistent across all artifacts.",
          "Both sizing methods and scenarios reproduce and their differences and sensitivities are explained.",
          "Every material claim is cited and the recommendation addresses alternatives, counterevidence, and implementation risk.",
        ],
      };
    case "P083":
      return {
        scopeActions: [
          "Build an individually executable four-echelon spreadsheet with retailer, wholesaler, distributor, and factory stages; no class session, partner, or external simulator is required.",
          "Use 24 weeks, initial inventory 12 and backlog 0 at each stage, incoming shipment and order 4, two-period information and shipment delays, demand 4 for weeks 1-4 and 8 for weeks 5-24.",
          "Compare two predeclared policies using the same demand: a reactive order-equals-recent-demand rule and a base-stock rule with stated target and bounds.",
        ],
        setupActions: [
          "Create auditable formulas for beginning inventory, receipts, demand, shipments, ending inventory, backlog, placed orders, pipeline, holding cost, and backlog cost at each echelon.",
          "Add checks for flow conservation, nonnegative shipments, delay indexing, demand consistency, and identical initial conditions across policy runs.",
          "Define bullwhip as order variance divided by customer-demand variance and also track service level, total backlog, peak inventory, and total cost.",
        ],
        validationActions: [
          "Run both policies for all 24 weeks, verify every formula check, and graph demand, orders, inventory, and backlog by echelon.",
          "Compare bullwhip, service level, backlog, inventory, and cost, then explain how delays and policy choices caused observed dynamics.",
          "Change one delay or target assumption as a sensitivity and distinguish simulated behavior from a forecast of an actual supply chain.",
        ],
        validationDone: [
          "Both policy runs use identical fixed inputs and pass flow and delay checks.",
          "Bullwhip, service level, inventory, backlog, and cost metrics reproduce from the workbook.",
          "The report explains mechanisms and limitations without claiming a real operational result.",
        ],
      };
    case "P086":
      return {
        scopeActions: [
          "Use a fictional pedestrian-only 30-by-20-meter warehouse with one receiving and shipping dock, two 1.2-meter main routes, one unobstructed 0.9-meter exit-access path, and exactly 24 equal storage slots; powered equipment, rack engineering, fire loading, and occupancy design are outside scope.",
          "Use 12 SKUs with weekly pick shares of 20, 16, 13, 11, 9, 8, 6, 5, 4, 3, 3, and 2 percent; assign every SKU exactly two adjacent 10-case slots in both layouts, for 20 cases per SKU, 24 occupied slots, and no unused or shared capacity.",
          "Compare alphabetical paired-slot baseline placement with frequency-based paired-slot placement using identical coordinates, inventory, dock, and Manhattan round-trip distance; use the ADA 36-inch accessible-route and OSHA 28-inch exit-access minimums only as cited practice references, not as a warehouse code-compliance determination.",
        ],
        setupActions: [
          "Create dimensioned baseline and proposed layouts with coordinates for the dock, two 1.2-meter pedestrian routes, the unobstructed 0.9-meter exit path, and storage slots 01 through 24.",
          "Build an assignment table that maps each SKU to two adjacent slots and proves 12 SKUs times two slots equals all 24 occupied slots, then calculate slot-center Manhattan round-trip distance and pick-share-weighted travel per 100 picks.",
          "Add checks for unique slot assignment, two slots per SKU, 10 cases per slot, identical total inventory, route widths, and the cited ADA and OSHA reference minimums; label the exercise as simplified planning rather than accessibility, egress, fire, or operational certification.",
        ],
        setupDone: [
          "Both layouts contain exactly 24 uniquely numbered and occupied slots, with two adjacent 10-case slots assigned to each of 12 SKUs.",
          "The dock, routes, exit-access path, coordinates, inventory, and distance convention are identical between baseline and proposal.",
          "The standards log cites the ADA and OSHA reference dimensions and states the important compliance areas excluded from this simplified case.",
        ],
        buildActions: [
          "Place paired SKU slots alphabetically for the baseline and place the highest-pick-share pairs closest to the dock for the proposal without changing any slot coordinate, capacity, route, or exit-access path.",
          "Calculate each SKU's mean round-trip distance across its two slots, multiply by picks per 100 orders, and sum the weighted travel for each layout with formulas linked to the assignment table.",
          "Create matching before-and-after diagrams and a case study that explains travel reduction, capacity invariance, blocked-route and demand-shift trade-offs, and the noncompliance boundary.",
        ],
        buildDone: [
          "Every SKU has two unique adjacent slots and 20 cases of capacity in both layouts with no empty, duplicate, or shared slot.",
          "Weighted travel traces from slot coordinates, the common dock, and the fixed pick-share vector without a hard-coded improvement percentage.",
          "The diagrams and workbook use the same coordinates, route widths, exit path, slot assignments, and inventory assumptions.",
        ],
        validationActions: [
          "Recalculate both weighted-travel totals independently and verify 24 unique occupied slots, two slots and 20 cases per SKU, identical total inventory, and no obstruction of the 1.2-meter routes or 0.9-meter exit-access path.",
          "Run a blocked-main-route case and a 25 percent increase in the top SKU's pick share with all shares renormalized to 100 percent, then report whether the proposed pairing remains feasible and beneficial.",
          "Compare the modeled widths with the cited ADA and OSHA reference minimums while explicitly stating that actual accessibility, egress, fire, rack, powered-equipment, and occupancy compliance requires site-specific professional review.",
        ],
        validationDone: [
          "Layouts and workbook use the same dimensions, coordinates, 24-slot allocation, two-slot-per-SKU capacity, and baseline demand mix.",
          "Travel, slot uniqueness, inventory, route, exit-access, blocked-route, and demand-shift checks reproduce for both layouts.",
          "All results are labeled synthetic planning estimates, and cited reference checks are not described as site compliance or measured savings.",
        ],
      };
    case "P087":
      return {
        scopeActions: [
          "Choose one U.S. ZIP code or small submarket and one property type, then fix a retrieval date and a consistent unit/size filter.",
          "Manually cite three to five currently public Redfin listing or rental pages as property-level observations; do not scrape or imply closed transactions.",
          "Use HUD Small Area/Fair Market Rents and Census data as public benchmarks; if fewer than three listings are available, use the benchmarks and state that no property-level conclusion is supported.",
        ],
        setupActions: [
          "Create a comparable table with URL, retrieval date, asking price or rent, property type, size, unit basis, and inclusion/exclusion reason.",
          "Download the matching HUD rent and Census geography data, record years and definitions, and keep them separate from listing observations.",
          "Create an assumptions and limitations log covering asking-versus-closed prices, missing concessions, listing duplication, and small sample size.",
        ],
        setupDone: [
          "Every property observation has a public URL, retrieval date, normalized unit basis, and selection rationale.",
          "HUD and Census benchmarks use the same named geography or document any mismatch.",
          "A fallback is documented for sparse listings and prevents unsupported property-level conclusions.",
        ],
      };
    case "P088":
      return {
        scopeActions: [
          "Use this fictional case: 24 apartment units purchased for $3.6M, $1,450 monthly average rent, $50/unit monthly other income, 95% occupancy, and Year 1 operating expenses equal to 38% of Year 1 effective gross income; calculate Year t operating expenses as Year 1 operating expenses times (1 + expense growth) raised to (t - 1).",
          "Model 65% loan-to-cost debt at 6.5% interest with 30-year amortization, a five-year hold, 3% annual rent growth, 3% annual operating-expense growth, a 6.25% exit cap, and 2% selling costs.",
          "Label every case input as fictional, define annual timing and sign conventions, and require base, upside, and downside sensitivities without implying a real investment recommendation.",
        ],
        setupActions: [
          "Create separate case-input, operating pro forma, debt schedule, returns, sensitivity, formula-check, and memo sections in an editable spreadsheet.",
          "Enter the fictional case exactly once in the input sheet, including the 38% Year 1 expense ratio and separate annual expense-growth input, and link every downstream calculation to it.",
          "Add checks for unit count, potential rent, vacancy, effective gross income, Year 1 operating expenses equal to 38% of Year 1 effective gross income, Years 2-6 operating expenses equal to the Year 1 expense base times (1 + expense growth) raised to (year - 1), NOI, debt balance, debt service, sale proceeds, levered cash-flow signs, IRR inputs, equity multiple, DSCR, and sources and uses balance.",
        ],
        setupDone: [
          "All fictional case inputs, units, timing conventions, and scenario changes are visible in one input sheet, including the Year 1 expense ratio and annual expense-growth rate as distinct inputs.",
          "The formula checks prove Year 1 operating expenses equal 38% of Year 1 effective gross income and Years 2-6 compound only from that Year 1 expense base.",
          "The debt schedule amortizes to the modeled balance and the sources/uses check balances.",
          "No proprietary property data or unsupported real-world outcome claim is present.",
        ],
        buildActions: [
          "Calculate potential rental income as units times monthly rent times 12, occupied rental and other income using the occupancy assumption, and effective gross income as their sum; set Year 1 operating expenses to 38% of Year 1 effective gross income, calculate each later year's operating expenses as Year 1 operating expenses times (1 + expense growth) raised to (year - 1), and calculate NOI as effective gross income minus operating expenses for Years 1 through 6.",
          "Set initial debt to purchase price times loan-to-cost, equity to purchase price minus debt, monthly debt service with PMT at 6.5 percent divided by 12 over 360 months, annual debt service as 12 monthly payments, and year-end balances from a linked amortization schedule.",
          "Calculate annual levered cash flow as NOI minus debt service; calculate exit value from Year 6 NOI divided by the exit cap, net sale proceeds as exit value less 2 percent selling costs and the Year 5 loan balance, Year 5 total cash flow including net sale proceeds, IRR from initial negative equity through Year 5 cash flows, equity multiple as total positive cash flow divided by initial equity, and DSCR as NOI divided by debt service.",
        ],
        buildDone: [
          "Potential rent, effective gross income, operating expenses, NOI, debt service, loan balance, sale proceeds, levered cash flows, IRR, equity multiple, and DSCR all link to the single case-input sheet.",
          "Year 1 operating expenses use the 38% ratio once, and every later year's operating expenses use the declared compound-growth formula rather than recalculating a fixed percentage of that year's effective gross income.",
          "The Year 6 NOI exit convention, Year 5 loan payoff, cash-flow signs, monthly amortization timing, and scenario changes are visible and consistent.",
          "The memo explains the fictional base case and does not present the outputs as an investment recommendation or current market forecast.",
        ],
        validationActions: [
          "Independently recalculate Year 1 potential rent, occupied income, effective gross income, operating expenses at 38% of Year 1 effective gross income, NOI, initial debt and equity, monthly payment, Year 5 balance, Year 6 NOI, exit value, selling costs, and net sale proceeds; for Years 2-6, verify operating expenses equal the Year 1 expense base times (1 + the scenario's expense-growth rate) raised to (year - 1), with no later-year 38%-of-effective-gross-income recalculation.",
          "Confirm sources and uses balance, the amortization schedule reaches the Year 5 payoff balance, IRR includes exactly one initial negative cash flow and five annual positive or negative cash flows, equity multiple uses total distributions over initial equity, and DSCR uses NOI over annual debt service.",
          "Run the fixed downside case at 90 percent occupancy, 1 percent rent growth, 4 percent expense growth, and 6.75 percent exit cap and the fixed upside case at 97 percent occupancy, 4 percent rent growth, 2 percent expense growth, and 5.75 percent exit cap; reconcile every memo output to the model and label all results fictional.",
        ],
        validationDone: [
          "Independent checks reproduce revenue, the Year 1 expense base, Years 2-6 compounded operating expenses, NOI, debt service, ending debt, sale proceeds, annual cash flows, IRR, equity multiple, and DSCR within displayed rounding.",
          "Base, downside, and upside cases change only their declared inputs and preserve the same formulas and timing conventions.",
          "The model, formula-check sheet, and memo agree and contain no proprietary data, recommendation, or unsupported market claim.",
        ],
        packageActions: [
          "Revise and organize the final editable pro forma model, 3-page memo, case-input sheet, and formula-check sheet; confirm the package shows Year 1 operating expenses at 38% of Year 1 effective gross income and Years 2-6 operating expenses as the Year 1 expense base times (1 + expense growth) raised to (year - 1), with no later-year 38%-of-effective-gross-income recalculation.",
          "Add the required submission evidence: Editable pro forma model, Practice investment memo.",
          "Open every uploaded file or link from the submission preview and confirm a reviewer can understand it without extra explanation.",
        ],
        packageDone: [
          "The final package contains the editable pro forma model, 3-page memo, case-input sheet, and formula-check sheet, and all four artifacts use the same Year 1 expense-base and compound-growth rule.",
          "Every required evidence item is present: Editable pro forma model, Practice investment memo.",
          "Files and links open successfully, sensitive information is removed, and setup or review instructions are included.",
        ],
      };
    case "P090":
      return {
        scopeActions: [
          "Use only CDC NHANES 2017-2018 public-use Demographics and Body Measures files, record exact file and codebook URLs, release cycle, retrieval date, respondent sequence key, and public-use disclosure limits.",
          "Define an adult descriptive cohort and a bounded question about distributions or associations; list required fields, units, special missing codes, inclusion rules, and survey-design limitations.",
          "Prohibit diagnosis, treatment, individual risk scores, causal claims, re-identification, and use of restricted or linked non-public records.",
        ],
        setupActions: [
          "Save raw files and codebooks unchanged, create a field map for identifiers, labels, units, valid ranges, special missing codes, and analytic use.",
          "Create a reproducible cleaning log for merge cardinality, eligibility, exclusions, duplicates, missingness, recodes, unit checks, and derived variables.",
          "Keep only the variables needed for the stated question and create an aggregate output rule that never exposes respondent-level rows in the portfolio summary.",
        ],
        validationActions: [
          "Reconcile raw and cleaned row counts, verify one-to-one merges, inspect missingness, special codes, outliers, units, and impossible values against the codebooks.",
          "Re-run the cleaning from raw files, compare key summary values with CDC documentation where available, and record all exclusions and corrections.",
          "Check every statement for descriptive, non-clinical language and remove respondent-level examples, causal interpretation, or population claims unsupported by the survey design.",
        ],
        validationDone: [
          "Files, cycle, codebooks, fields, units, cohort, and exclusions are fully traceable.",
          "Merge, missingness, coding, outlier, and reproducibility checks pass with a complete cleaning log.",
          "Outputs are aggregate and contain no clinical, causal, diagnostic, or re-identification claim.",
        ],
      };
    case "P093":
      return {
        scopeActions: [
          "Use one named CDC PLACES County Data release, record release year, data dictionary, measure IDs, population, geography, denominators, age-adjustment status, suppression rules, and retrieval date.",
          "Define a public-health planning audience and three to five descriptive KPIs; do not use non-public data or make individual, clinical, causal, or program-effectiveness claims.",
          "Require a viewable Tableau Public dashboard, packaged workbook or export, one-page write-up, source log, and accessibility test record.",
        ],
        setupActions: [
          "Download and preserve the selected aggregate public data, map every field through the CDC dictionary, and document cleaning and suppression handling.",
          "Create the Tableau workbook with source caption, definitions, date, filters, readable labels, non-color-only encodings, text alternatives or equivalent descriptions, and dashboard reading order.",
          "Publish a minimal test workbook to Tableau Public and verify from a private window that the link opens without an access request and exposes no non-public data.",
        ],
        validationActions: [
          "Reconcile dashboard totals and sample county values to the cleaned source table and CDC portal, including denominator and suppression handling.",
          "Test filters, tooltips, labels, keyboard or focus behavior available in Tableau, color contrast, color independence, reading order, and small-screen legibility.",
          "Open the public link privately, download or reopen the packaged workbook, and verify the write-up distinguishes ecological association from causation and clinical interpretation.",
        ],
        validationDone: [
          "Every KPI and displayed value traces to a named CDC release, measure, population, denominator, and cleaning rule.",
          "The public link and packaged workbook open and accessibility checks and limitations are documented.",
          "The dashboard contains only aggregate public data and no clinical, causal, or individual conclusion.",
        ],
      };
    case "P095":
      return {
        scopeActions: [
          "Benchmark one defined occupation in one U.S. state or metro using the latest available BLS OEWS release and its published occupation code.",
          "Use the OEWS 25th, 50th, and 75th percentiles as transparent practice anchors; do not claim they are company-specific pay grades or individual salary recommendations.",
          "Record geography, occupation code, release year, effective date, currency, full-time assumption, and any annualization or rounding method.",
        ],
        setupActions: [
          "Download the BLS OEWS state or metro table and save the source URL, release year, retrieval date, and occupation definition.",
          "Create a workbook with raw source, normalized benchmark, proposed practice range, checks, and memo-output sections.",
          "Add rules for missing percentiles, suppressed data, geography mismatch, hourly-to-annual conversion, and avoiding protected-attribute or individual pay data.",
        ],
        setupDone: [
          "The selected role, occupation code, geography, release year, and effective date are fixed and cited.",
          "Every benchmark value traces to a BLS OEWS field and documented normalization.",
          "The exercise is framed as aggregate public-data practice, not individual compensation advice.",
        ],
        validationActions: [
          "Reconcile the 25th, 50th, and 75th percentile values to the saved OEWS table and verify occupation, geography, release, units, and annualization.",
          "Test suppressed or missing percentiles, hourly-to-annual conversion, rounding, geography changes, and formula references without silently substituting another occupation.",
          "Verify the workbook, memo, summary, and source log agree and describe aggregate practice ranges rather than individual pay decisions or company-specific grades.",
        ],
        validationDone: [
          "Every benchmark value and normalization formula traces to the selected OEWS record.",
          "Suppression, geography, annualization, and formula checks pass or are clearly disclosed.",
          "The complete editable workbook, memo, summary, and source log are packaged without individual compensation advice.",
        ],
      };
    case "P096":
      return {
        scopeActions: [
          "Use a fictional 80-member student organization scenario and design a 12-15 item engagement survey; no real organization, partner, respondent, or acknowledgment letter is required.",
          "Define constructs, audience, action owner, optional demographics, anonymity rule, no free-text sensitive questions, and suppression for any displayed group smaller than 10.",
          "Use Google Forms as the named free survey-authoring path in preview-only mode, generate 60 disclosed synthetic responses in Google Sheets or Python with a fixed seed and documented distributions, and prohibit collecting real responses or claiming the results represent real people or support employment decisions.",
        ],
        setupActions: [
          "Create the 12-15 item instrument in Google Forms without distributing it or accepting real responses, then export a PDF or screenshots and preserve a construct-to-item map, response-scale rationale, fictional-practice introduction, and codebook.",
          "Write or document a seeded synthetic generator with no real names, emails, identifiers, or copied response text and record every assumption.",
          "Use the Pew and AAPOR guidance to pretest every item for one construct, simple neutral wording, mutually exclusive response options, logical order, and answerability, then create an analysis plan for distributions, construct summaries, missingness, small-group suppression, uncertainty, and at most three bounded recommendations.",
        ],
        setupDone: [
          "The Google Forms instrument opens in preview mode, contains no response collection, and exports to an inspectable format without paid features.",
          "The construct map, item wording, response scales, fictional introduction, and codebook agree with the saved instrument.",
          "The seeded generator and analysis environment run in free Google Sheets or Python without real respondent data.",
        ],
        validationActions: [
          "Review every question against the Pew and AAPOR guidance for leading, double-barreled, ambiguous, sensitive, non-actionable, overlapping, incomplete, and order-biased wording and record revisions.",
          "Re-run the synthetic generator and analysis, verify suppression for groups below 10, and label all tables and charts as fictional synthetic practice data.",
          "Open the saved Google Forms preview and exported instrument, confirm no live responses were collected, and trace recommendations to the predeclared constructs while stating that synthetic patterns cannot justify action in a real organization.",
        ],
        validationDone: [
          "The Google Forms instrument, export, construct map, codebook, seeded dataset, and analysis reproduce using only named free tools and no real respondent data.",
          "Pew and AAPOR question-quality checks, anonymity, optional-demographic, and small-group suppression rules are applied.",
          "Every artifact clearly identifies the fictional scenario and excludes employment or real-organization claims.",
        ],
      };
    case "P098":
      return {
        scopeActions: [
          "Use the fixed decision: whether and how the City of Chicago should expand its residential food-scrap drop-off program over a two-year implementation period.",
          "Define the municipal decision-maker, current-program baseline, affected residents, service geography, as-of date, legal and budget boundaries, and primary-source hierarchy.",
          "Compare status quo, targeted expansion, and broader expansion using access, operations, cost, equity, diversion, contamination, and implementation criteria without claiming authority to speak for the City.",
        ],
        setupActions: [
          "Create a dated authority and evidence log covering Chicago program pages, relevant municipal code, budget or operations material, public data, stakeholder positions, and credible counterevidence.",
          "Create an alternatives matrix with benefits, costs, staffing or vendor needs, operational constraints, affected groups, risks, and measurable implementation indicators.",
          "Separate controlling local authority, persuasive external evidence, factual findings, assumptions, and the student's recommendation.",
        ],
        validationActions: [
          "Reopen and current-check every primary source, verify citations and dates, and remove claims not supported within the fixed Chicago jurisdiction and decision boundary.",
          "Pressure-test fiscal, collection, contamination, site access, equity, procurement, staffing, and stakeholder objections for all three alternatives.",
          "Verify the recommendation includes phased implementation, responsible owner, indicators, risks, and limitations rather than presenting an advocacy claim as settled fact.",
        ],
        validationDone: [
          "Jurisdiction, issue, decision-maker, legal authority, currentness date, and baseline are explicit.",
          "Three alternatives are compared on fiscal, operational, equity, stakeholder, and implementation evidence.",
          "Every material claim is cited and findings, assumptions, and recommendations remain distinct.",
        ],
      };
    case "P100":
      return {
        scopeActions: [
          "Analyze only Loper Bright Enterprises v. Raimondo, 603 U.S. 369 (2024), using the official Supreme Court opinion as the primary authority and a fixed currentness-check date.",
          "Define jurisdiction, procedural posture, questions presented, majority holding, reasoning, concurrence or dissent, and bounded implications for federal administrative-law analysis.",
          "State that the brief is academic practice, not legal advice, and does not predict an outcome for any client, dispute, agency, or jurisdiction outside the case.",
        ],
        setupActions: [
          "Save the official opinion, record slip and U.S. Reports citations, identify majority and separate opinions, and create a pin-cite table for every proposition used.",
          "Create an authority log distinguishing the binding Supreme Court holding, quoted prior authority, dicta, separate opinions, and later citing decisions found in the currentness check.",
          "Create a brief outline for facts, posture, issue, rule, holding, reasoning, counterargument, limits, and plain-language summary before drafting.",
        ],
        validationActions: [
          "Verify every case proposition and quotation against the official opinion and pin cite, and distinguish holding from dicta and majority from separate opinions.",
          "Run a currentness and subsequent-history check using a public database, record the date and method, and avoid claiming exhaustive citator coverage.",
          "Review procedural posture, counterargument, citation format, plain-language accuracy, and the no-legal-advice boundary.",
        ],
        validationDone: [
          "The official opinion, citations, procedural posture, issue, holding, reasoning, and opinion authorship are accurate and traceable.",
          "Holding, dicta, separate opinions, counterargument, and later-history limits are clearly distinguished.",
          "The work is labeled academic analysis and contains no client-specific legal advice.",
        ],
      };
    case "P101":
      return {
        scopeActions: [
          "Use the fictional baseline of a campus event finder with browse, event detail, save, and calendar-export flows; do not copy or imply affiliation with a real product or institution.",
          "Use a documented heuristic evaluation as the guaranteed evidence path; optional participant sessions require informed consent, adult volunteers, a fixed task script, anonymized notes, and the right to stop.",
          "Define success criteria for findability, task completion, clarity, accessibility, and prototype coverage and prohibit invented quotes, metrics, or user findings.",
        ],
        setupActions: [
          "Create the fictional baseline screens, heuristic checklist, task flows, severity scale, evidence log, and view-only Figma sharing plan.",
          "If using participants, prepare consent, recruitment criteria, three to five adult volunteers, note anonymization, and deletion timing; otherwise use the full heuristic protocol.",
          "Verify a Figma view-only prototype link opens in a private window and create separate folders for evidence, decisions, screens, and case-study exports.",
        ],
        validationActions: [
          "Complete the heuristic review or consent-based sessions, trace each design change to evidence, and label assumptions and optional feedback separately.",
          "Test the browse-to-save and calendar-export flows, keyboard order in the prototype where supported, contrast, labels, empty states, and error recovery.",
          "Open the prototype privately and verify the case study contains the fictional and unaffiliated disclaimer, protocol, evidence, decisions, accessibility checks, and limitations.",
        ],
        validationDone: [
          "Every design change traces to documented heuristic or consent-based evidence and no finding is invented.",
          "The view-only prototype covers the required flows and opens without requesting access.",
          "The case is clearly fictional and unaffiliated and includes protocol, accessibility, and evidence limitations.",
        ],
      };
    case "P102":
      return {
        scopeActions: [
          "Define a bounded app problem, primary user scenario, research questions, accessibility needs, and success criteria.",
          "Choose either three to five consent-based participants or the guaranteed fallback: a documented heuristic review by the student using recognized usability principles and WCAG.",
          "Require a view-only Figma prototype link plus a case-study PDF that distinguishes observed evidence from assumptions.",
        ],
        setupActions: [
          "Create the Figma file and verify a view-only prototype link opens in a private/incognito window without requesting access.",
          "Prepare either consent and interview materials or a heuristic checklist with task flows, severity definitions, and evidence-capture rules.",
          "Create folders for research or heuristic evidence, flows, design system, accessibility checks, prototype, and final case study.",
        ],
        setupDone: [
          "The view-only Figma prototype opens without sign-in or an access request.",
          "A feasible participant protocol or the complete heuristic fallback is ready before design evaluation.",
          "Evidence, assumptions, accessibility checks, and final presentation files have distinct locations.",
        ],
        validationActions: [
          "Apply the documented Nielsen Norman heuristic protocol to each primary task flow, assigning evidence, severity, and a recommended change; if participants were used, analyze only consented anonymized notes.",
          "Trace information architecture, flow, component-system, and accessibility decisions to evidence while labeling assumptions separately from observed findings.",
          "Open the view-only prototype privately, test the full task flow and key states, and verify the case study accurately names the evaluation method instead of claiming user research for a heuristic-only path.",
        ],
        validationDone: [
          "The evaluation method, evidence, severity, and resulting revisions are reproducible and honestly labeled.",
          "The prototype covers the defined flows, system states, and accessibility checks and opens without an access request.",
          "Heuristic-only work is described as usability evaluation, not participant research.",
        ],
      };
    case "P104":
      return {
        scopeActions: [
          "Select no more than five public pages on one website that permits ordinary browsing and low-impact client-side testing; do not authenticate, submit destructive forms, crawl broadly, or test third-party systems.",
          "Use WCAG 2.2 AA as the stated reference and define the audit as a sampled evidence report, not certification, legal advice, or proof of site-wide compliance.",
          "Require automated axe or Lighthouse output plus manual keyboard, focus, contrast, labels, headings, landmarks, forms, images, zoom, and screen-reader sampling.",
        ],
        setupActions: [
          "Record the site, exact page URLs, retrieval date, browser, viewport, axe or Lighthouse version, screen reader if sampled, and the WAI evaluation method.",
          "Create an issue template for WCAG criterion, page, component, steps, expected and observed behavior, evidence, user impact, severity rationale, and recommended fix.",
          "Run a single low-impact smoke audit and confirm scripts and screenshots collect no credentials, personal form data, session tokens, or private content.",
        ],
        validationActions: [
          "Repeat automated checks and manually test keyboard reachability, logical focus order, visible focus, bypass mechanisms, headings, labels, errors, color contrast, 200 percent zoom, and a bounded screen-reader task.",
          "Reproduce every retained issue from clean steps, remove false positives, map it to WCAG 2.2 AA, and prioritize by user impact rather than automated score alone.",
          "Review recommended fixes for technical plausibility and verify the report states page sample, tools, dates, untested areas, and non-certification boundary.",
        ],
        validationDone: [
          "Every retained finding has reproducible manual or automated evidence, a WCAG mapping, impact, severity rationale, and fix.",
          "Keyboard, focus, contrast, labels, structure, zoom, and screen-reader sampling are all documented.",
          "Testing stayed low-impact and the report makes no certification, legal, or site-wide compliance claim.",
        ],
      };
    case "P107":
      return {
        scopeActions: [
          "Choose one narrow subject the student can accurately teach, define learner context and prerequisite knowledge, and write two to four measurable learning objectives before drafting content.",
          "Use backward design to align every explanation, activity, and assessment item to an objective and choose a guaranteed free publishing path such as Pressbooks or a static GitHub Pages site.",
          "License original content under a stated Creative Commons license and include source, creator, license, and attribution for every reused open asset; exclude content without clear reuse rights.",
        ],
        setupActions: [
          "Create an objective-to-content-to-assessment alignment table, module outline, accessibility checklist, attribution log, and peer-evaluation rubric.",
          "Create and privately test the free host, record its account and export limits, and maintain a downloadable module package as the hosting fallback.",
          "Set heading, link, alt-text, caption or transcript, color, keyboard, reading-order, plain-language, and format requirements before authoring.",
        ],
        validationActions: [
          "Verify every objective has instruction, practice, and assessment evidence and remove activities or questions that do not measure the stated outcome.",
          "Run keyboard, heading, alt-text, link, contrast, caption/transcript, reading-order, and mobile checks and have one peer apply the fixed rubric without collecting sensitive learner data.",
          "Open the hosted module privately, reopen the downloadable package, and verify license, attributions, methodology, objectives, and assessments remain accessible.",
        ],
        validationDone: [
          "Objectives, content, practice, and assessment align in the submitted matrix.",
          "The hosted and downloadable versions pass the stated accessibility and peer-review checks.",
          "Every reused asset has compatible license and attribution and the student's Creative Commons license is visible.",
        ],
      };
    case "P110":
      return {
        scopeActions: [
          "Choose a low-risk local-government process or spending question answerable primarily from already public records; avoid allegations about private individuals and do not require interviews, confrontation, or unsafe field reporting.",
          "Define jurisdiction, question, publication boundary, records and source plan, claim standard, as-of date, right-of-reply rule, and a public-records-only fallback if access or interviews fail.",
          "Prohibit trespass, deception, covert recording, doxxing, confidential-source promises the student cannot protect, and publication of unnecessary personal or sensitive information.",
        ],
        setupActions: [
          "Build a source ledger for each public record, meeting record, budget, dataset, official response, and secondary source with URL, date, provenance, key claim, and verification status.",
          "Use FOIA.gov or the applicable public-records process only if needed and feasible, but set a deadline after which the article proceeds using available public records and states the limitation.",
          "Create a claim-by-claim fact-check sheet, legal and ethics checklist, contact/right-of-reply log where a named entity faces criticism, and corrections plan.",
        ],
        validationActions: [
          "Verify every factual statement against the source ledger and a second source where practical; label estimates, disputed facts, and unanswered questions.",
          "Review consent, anonymity, source protection, privacy, defamation, copyright, public-record context, right of reply, headlines, captions, links, and accessible presentation.",
          "Remove unsupported allegations and unnecessary personal details, preserve correction notes, and package the article with methodology even if no outlet publishes it.",
        ],
        validationDone: [
          "Every material factual claim traces to a record or named source and the fact-check sheet is complete.",
          "Privacy, defamation, rights, consent, right-of-reply, and personal-safety checks are recorded with no high-risk unresolved claim.",
          "The article remains publishable as a draft without interviews or external acceptance and includes limitations and corrections policy.",
        ],
      };
    case "P111":
      return {
        scopeActions: [
          "Choose either original phone footage with permission or a no-interview fallback built from public-domain or clearly licensed media plus student-written narration.",
          "Record source, creator, license, attribution, participant release status, and location permission for every media asset before editing.",
          "Plan a 5-7 minute story, captions, transcript, low-spec editing route, backup/export settings, and the public or unlisted evidence link.",
        ],
        setupActions: [
          "Test Microsoft Clipchamp in the browser or install DaVinci Resolve, then export a 30-second captioned sample; use Clipchamp as the low-spec fallback.",
          "Prepare releases only if recording people; otherwise finalize the public-domain/licensed-media source log and narration script.",
          "Create folders for source media, licenses/releases, narration, project files, captions, backups, and final exports.",
        ],
        setupDone: [
          "The chosen free editor exports a captioned sample on the available hardware.",
          "Every planned media asset has a permission or redistribution basis, and interviews are optional.",
          "The evidence plan includes an accessible public/unlisted video link and production notes.",
        ],
        buildActions: [
          "Produce the 5-7 minute documentary from authorized original footage or rights-cleared media and student narration.",
          "Edit for factual accuracy, pacing, audio clarity, captions, attribution, and the requested production-note package.",
          "Record editorial decisions, source/permission status, backup location, and unresolved limitations.",
        ],
      };
    case "P113":
      return {
        scopeActions: [
          "Use the fixed fictional store: a 20-by-12-meter single-floor shop with one front entrance, one checkout, six 4-by-1-meter fixtures, a continuous 1.2-meter modeled pedestrian route, and no real store or customer observation.",
          "Use 1,000 synthetic weekly visitors, a 22 percent baseline conversion rate, a $32 average transaction, baseline zone visit shares of 35, 25, 18, 12, and 10 percent, and fixed zone purchase-propensity multipliers of 0.80, 0.90, 1.00, 1.15, and 1.30; label every value as an Intrnd practice assumption.",
          "Use target proposed shares of 25, 25, 20, 17, and 13 percent and calculate conversion as 22 percent times proposed weighted propensity divided by baseline weighted propensity; treat this as a transparent scenario, not causal or measured uplift, and use ADA and OSHA references only to check the simplified route and exit assumptions rather than claim code compliance.",
        ],
        setupActions: [
          "Draw dimensioned baseline and proposed layouts with entrance, checkout, fixtures, the continuous 1.2-meter pedestrian route, and an unobstructed 0.9-meter exit-access path, then enter every fixed input once in an editable workbook.",
          "Calculate baseline weighted propensity as the sum of baseline share times zone multiplier; define downside shares halfway from baseline to target, base shares at the target, and upside shares at one-and-a-half times the baseline-to-target change, confirming every scenario totals 100 percent.",
          "Create formulas for scenario conversion, transactions as visitors times conversion, revenue as transactions times $32, path distance, fixture capacity, and checks for share totals, conversion bounds, route widths, formula links, and the no-client/no-live-results/no-compliance disclaimer.",
        ],
        setupDone: [
          "Baseline, target, downside, base, and upside shares and the five fixed propensity multipliers are visible and each share vector sums to 100 percent.",
          "The workbook reproduces baseline conversion at exactly 22 percent by normalizing each scenario's weighted propensity to the baseline weighted propensity.",
          "Both diagrams preserve the modeled pedestrian and exit-access paths, and the standards log distinguishes cited reference checks from actual code compliance.",
        ],
        buildActions: [
          "Create the proposed layout and explain which fixture moves produce the fixed target share vector without presenting the assumed shares as observed behavior.",
          "For downside, base, and upside shares, calculate weighted propensity, scenario conversion, transactions, revenue, path distance, fixture capacity, and differences from the 22 percent baseline with formulas linked to one assumptions table.",
          "Produce before-and-after diagrams and a memo that separates fixed inputs, layout choices, scenario calculations, commercial trade-offs, accessibility and exit reference checks, and limitations.",
        ],
        buildDone: [
          "Every displayed conversion, transaction, and revenue result traces through the fixed share and propensity formula without an invented hard-coded uplift.",
          "Downside, base, and upside scenarios change only the declared zone shares and use the same visitors, transaction value, multipliers, and formulas.",
          "The diagrams, workbook, memo, and assumptions log use identical dimensions, route assumptions, fixtures, and scenario labels.",
        ],
        validationActions: [
          "Independently recalculate every share total, weighted propensity, normalized conversion, transaction count, and revenue result; test zero visitors, a zero transaction value, share totals other than 100 percent, and conversion bounds.",
          "Verify both diagrams use the same dimensions and preserve the 1.2-meter pedestrian route and 0.9-meter exit-access path, compare them with the cited ADA and OSHA minimum references, and document that full accessibility, egress, fire, and occupancy compliance is outside scope.",
          "Check that every difference is labeled a synthetic scenario estimate and that no artifact implies a real client, store observation, causal layout effect, code approval, or measured performance.",
        ],
        validationDone: [
          "The fixed propensity formula reproduces baseline, downside, base, and upside conversion, transactions, and revenue from share vectors that each total 100 percent.",
          "Before-and-after layouts preserve the modeled pedestrian and exit-access paths and report reference checks without making a compliance claim.",
          "Every result is labeled fictional and no client engagement, store observation, causal uplift, code approval, or live conversion result is claimed.",
        ],
      };
    case "P114":
      return {
        scopeActions: [
          "Choose a fictional product or conduct an unaffiliated audit of a public listing without contacting the merchant, changing the live listing, or claiming access to platform analytics.",
          "Define audience, search intent, copy constraints, image-variant rationale, and an offline test plan with hypothetical metrics only.",
          "State explicitly that the project does not run a live A/B test and cannot claim conversion, traffic, revenue, or SEO performance outcomes.",
        ],
        setupActions: [
          "Save the public listing URL and retrieval date or create the fictional baseline, then record which content is source material and which is student-created.",
          "Use Google Merchant product-data guidance for required attributes and Canva for clearly labeled image variants.",
          "Create a source log, keyword rationale, before/after copy sheet, image-variant folder, and offline experiment-plan template.",
        ],
        setupDone: [
          "The product context is fictional or explicitly unaffiliated and contains no merchant-private data.",
          "Every source and student-created element is labeled, with no unsupported ownership or performance claim.",
          "The test plan is hypothetical/offline and does not depend on partner, platform, traffic, or analytics access.",
        ],
        validationActions: [
          "Check title, description, attributes, keywords, and image variants against the stated audience and Google Merchant guidance.",
          "Have a peer perform a preference or clarity review that is labeled qualitative and not presented as a conversion test.",
          "Remove all live-performance language and verify the final audit clearly separates baseline evidence, proposed variants, and hypothetical metrics.",
        ],
      };
    default:
      return {};
  }
}

function recipeForProject(project: RoadmapProjectInput) {
  const title = project.title.toLowerCase();
  if (project.id === "P001") {
    return {
      ...RECIPES.software,
      resources: [RESOURCES.mbtaApi, RESOURCES.mbtaRoutes, RESOURCES.pythonUrllib, RESOURCES.pythonArgparse, RESOURCES.github],
    };
  }
  if (project.id === "P034") {
    return {
      ...RECIPES.cybersecurity,
      resources: [RESOURCES.juiceShop, RESOURCES.dvwa, RESOURCES.burp, RESOURCES.owasp, RESOURCES.github],
    };
  }
  if (project.id === "P004") {
    return {
      ...RECIPES.software,
      resources: [RESOURCES.react, RESOURCES.node, RESOURCES.express, RESOURCES.postgresql, RESOURCES.renderFree, RESOURCES.github],
    };
  }
  if (project.id === "P007") {
    return {
      ...RECIPES.software,
      resources: [RESOURCES.express, RESOURCES.jwt, RESOURCES.openapi, RESOURCES.postman, RESOURCES.renderFree, RESOURCES.github],
    };
  }
  if (project.id === "P006") {
    return {
      ...RECIPES.software,
      resources: [RESOURCES.nextjsDeploy, RESOURCES.astroDeploy, RESOURCES.vercelHobby, RESOURCES.wcag, RESOURCES.mdn, RESOURCES.github],
    };
  }
  if (project.id === "P014") {
    return { ...RECIPES.ai, resources: [RESOURCES.uciStudent, RESOURCES.sklearn, RESOURCES.pandas, RESOURCES.python] };
  }
  if (project.id === "P019") {
    return {
      ...RECIPES.ai,
      buildTitle: "Build the sentiment dashboard and evaluation",
      resources: [RESOURCES.uciSentiment, RESOURCES.textblob, RESOURCES.streamlit, RESOURCES.pandas, RESOURCES.python],
    };
  }
  if (project.id === "P022") {
    return {
      ...RECIPES.ai,
      buildTitle: "Build the benchmark fairness audit",
      resources: [RESOURCES.uciAdult, RESOURCES.fairlearn, RESOURCES.sklearn, RESOURCES.python],
    };
  }
  if (project.id === "P023") {
    return { ...RECIPES.healthcare, resources: [RESOURCES.cdcPlaces, RESOURCES.pandas, RESOURCES.python] };
  }
  if (project.id === "P027") {
    return { ...RECIPES.data, resources: [RESOURCES.scipyStats, RESOURCES.pandas, RESOURCES.python] };
  }
  if (project.id === "P028") {
    return { ...RECIPES.data, resources: [RESOURCES.openMlTelco, RESOURCES.sklearn, RESOURCES.pandas, RESOURCES.python] };
  }
  if (project.id === "P029") {
    return { ...RECIPES.data, resources: [RESOURCES.excelHelp, RESOURCES.googleSheets, RESOURCES.epaGhg] };
  }
  if (project.id === "P039") {
    return { ...RECIPES.engineering, resources: [RESOURCES.edaPlayground, RESOURCES.verilator, RESOURCES.hdlGithub, RESOURCES.github] };
  }
  if (project.id === "P036") {
    return { ...RECIPES.cybersecurity, resources: [RESOURCES.rfc5322, RESOURCES.rfcEmailAuth, RESOURCES.testNet, RESOURCES.github] };
  }
  if (project.id === "P038") {
    return { ...RECIPES.cybersecurity, resources: [RESOURCES.wiresharkGuide, RESOURCES.wiresharkSamples, RESOURCES.github] };
  }
  if (project.id === "P040") {
    return { ...RECIPES.engineering, resources: [RESOURCES.wokwiArduino, RESOURCES.arduino, RESOURCES.github] };
  }
  if (project.id === "P047") {
    return {
      ...RECIPES.engineering,
      resources: [RESOURCES.ltspice, RESOURCES.ltspiceGettingStarted, RESOURCES.mpptBasics, RESOURCES.github],
    };
  }
  if (project.id === "P048") {
    return {
      ...RECIPES.engineering,
      resources: [RESOURCES.octave, RESOURCES.octaveSignal, RESOURCES.matlabSignal, RESOURCES.creativeCommons, RESOURCES.github],
    };
  }
  if (project.id === "P052") {
    return {
      ...RECIPES.engineering,
      resources: [
        RESOURCES.freecad,
        RESOURCES.freecadSimscale,
        RESOURCES.simscaleCommunity,
        RESOURCES.simscaleDocs,
        RESOURCES.ansysStudent,
      ],
    };
  }
  if (project.id === "P051") {
    return { ...RECIPES.engineering, resources: [RESOURCES.freecad, RESOURCES.github] };
  }
  if (project.id === "P057") {
    return { ...RECIPES.construction, resources: [RESOURCES.freecad, RESOURCES.librecad, RESOURCES.plainLanguage] };
  }
  if (project.id === "P059") {
    return { ...RECIPES.construction, resources: [RESOURCES.projectLibre, RESOURCES.plainLanguage] };
  }
  if (project.id === "P061") {
    return { ...RECIPES.construction, resources: [RESOURCES.libreoffice, RESOURCES.plainLanguage] };
  }
  if (project.id === "P063") {
    return { ...RECIPES.finance, resources: [RESOURCES.sec, RESOURCES.nasdaq, RESOURCES.treasuryRates, RESOURCES.damodaran] };
  }
  if (project.id === "P066") {
    return { ...RECIPES.finance, resources: [RESOURCES.sec, RESOURCES.nasdaq, RESOURCES.damodaran] };
  }
  if (project.id === "P070") {
    return {
      ...RECIPES.finance,
      resources: [RESOURCES.apple2044Note, RESOURCES.secCompanySearch, RESOURCES.finraBonds, RESOURCES.sec, RESOURCES.treasuryRates],
    };
  }
  if (project.id === "P071") {
    return { ...RECIPES.marketing, resources: [RESOURCES.canva, RESOURCES.wcag, RESOURCES.plainLanguage] };
  }
  if (project.id === "P076") {
    return { ...RECIPES.marketing, resources: [RESOURCES.sbaMarket, RESOURCES.plainLanguage, RESOURCES.canva] };
  }
  if (project.id === "P079") {
    return { ...RECIPES.consulting, resources: [RESOURCES.doeHeatPumps, RESOURCES.eiaResidential, RESOURCES.census, RESOURCES.sbaMarket] };
  }
  if (project.id === "P083") {
    return { ...RECIPES.operations, resources: [RESOURCES.mitBeerGame, RESOURCES.excelHelp, RESOURCES.googleSheets] };
  }
  if (project.id === "P086") {
    return {
      ...RECIPES.operations,
      resources: [RESOURCES.lean, RESOURCES.excelHelp, RESOURCES.adaAccessibleRoutes, RESOURCES.oshaExitRoutes],
    };
  }
  if (project.id === "P087") {
    return { ...RECIPES.realEstate, resources: [RESOURCES.redfinData, RESOURCES.hudFmr, RESOURCES.census] };
  }
  if (project.id === "P088") {
    return {
      ...RECIPES.realEstate,
      resources: [
        RESOURCES.damodaranRealEstate,
        RESOURCES.excelFormulas,
        RESOURCES.sheetsPower,
        RESOURCES.excelPmt,
        RESOURCES.excelIrr,
        RESOURCES.sheetsIrr,
        RESOURCES.plainLanguage,
      ],
    };
  }
  if (project.id === "P095") {
    return { ...RECIPES.hr, resources: [RESOURCES.blsOews, RESOURCES.plainLanguage] };
  }
  if (project.id === "P090") {
    return { ...RECIPES.healthcare, resources: [RESOURCES.nhanes, RESOURCES.pandas, RESOURCES.cdc] };
  }
  if (project.id === "P093") {
    return { ...RECIPES.healthcare, resources: [RESOURCES.cdcPlaces, RESOURCES.tableauAccessibility, RESOURCES.wcag] };
  }
  if (project.id === "P096") {
    return {
      ...RECIPES.hr,
      resources: [
        RESOURCES.googleForms,
        RESOURCES.pewSurveyQuestions,
        RESOURCES.aaporSurveyPractice,
        RESOURCES.python,
        RESOURCES.plainLanguage,
      ],
    };
  }
  if (project.id === "P098") {
    return { ...RECIPES.legal, resources: [RESOURCES.chicagoComposting, RESOURCES.chicagoCode, RESOURCES.plainLanguage] };
  }
  if (project.id === "P100") {
    return { ...RECIPES.legal, resources: [RESOURCES.loperBright, RESOURCES.courtListener, RESOURCES.plainLanguage] };
  }
  if (project.id === "P101") {
    return { ...RECIPES.design, resources: [RESOURCES.figmaShare, RESOURCES.usabilityHeuristics, RESOURCES.wcag] };
  }
  if (project.id === "P102") {
    return { ...RECIPES.design, resources: [RESOURCES.figmaShare, RESOURCES.usabilityHeuristics, RESOURCES.wcag, RESOURCES.figma] };
  }
  if (project.id === "P104") {
    return {
      ...RECIPES.design,
      resources: [RESOURCES.waiEvaluation, RESOURCES.axeDocs, RESOURCES.lighthouseAccessibility, RESOURCES.wcag],
    };
  }
  if (project.id === "P107") {
    return { ...RECIPES.education, resources: [RESOURCES.oerCommons, RESOURCES.pressbooks, RESOURCES.creativeCommons, RESOURCES.wcag] };
  }
  if (project.id === "P110") {
    return { ...RECIPES.media, resources: [RESOURCES.rcfp, RESOURCES.foia, RESOURCES.plainLanguage] };
  }
  if (project.id === "P111") {
    return {
      ...RECIPES.media,
      resources: [RESOURCES.clipchamp, RESOURCES.davinciResolve, RESOURCES.creativeCommons, RESOURCES.filmmakingBasics],
    };
  }
  if (project.id === "P114") {
    return { ...RECIPES.retail, resources: [RESOURCES.merchantListings, RESOURCES.canva, RESOURCES.plainLanguage] };
  }
  if (project.id === "P113") {
    return {
      ...RECIPES.retail,
      resources: [RESOURCES.excelHelp, RESOURCES.adaAccessibleRoutes, RESOURCES.oshaExitRoutes, RESOURCES.plainLanguage],
    };
  }
  if (/research paper|conference poster/.test(title)) return RECIPES.research;
  if (/rag question-answer/.test(title))
    return {
      ...RECIPES.ai,
      buildTitle: "Build the retrieval and answer pipeline",
      buildObjective:
        "Prepare the course-note corpus, create retrieval, connect answer generation, and preserve citations to retrieved passages.",
    };
  if (/annotated dataset/.test(title))
    return {
      ...RECIPES.ai,
      buildTitle: "Create and document the dataset release",
      buildObjective:
        "Collect, license, label, validate, and package the dataset with a dataset card instead of training an unrelated model.",
    };
  if (/fine-tune.*lora/.test(title))
    return {
      ...RECIPES.ai,
      buildTitle: "Prepare data and train the LoRA adapter",
      buildObjective: "Clean and split the training data, record adapter configuration, train reproducibly, and preserve baseline outputs.",
    };
  if (/certification|tryhackme|picoctf|coursera|edx/.test(title))
    return {
      ...RECIPES.education,
      buildTitle: "Complete the required learning path and applied work",
      buildObjective:
        "Complete the named modules honestly, preserve completion evidence, and apply the learning in the requested reflection, write-up, or capstone.",
    };
  if (/open source|translate open documentation/.test(title))
    return {
      ...RECIPES.software,
      buildTitle: "Prepare and submit the contribution",
      buildObjective:
        "Reproduce the issue, follow contribution guidelines, make the smallest maintainable change, and submit it for maintainer review.",
    };
  if (/podcast|documentary|newsletter|youtube|speaking series/.test(title)) return RECIPES.media;
  const category = String(project.category ?? "").toLowerCase();
  if (/\bai\b|\bmachine(?: learning)?\b/.test(category)) return RECIPES.ai;
  if (/data/.test(category)) return RECIPES.data;
  if (/cyber/.test(category)) return RECIPES.cybersecurity;
  if (/computer engineering|electrical engineering|mechanical engineering/.test(category)) return RECIPES.engineering;
  if (/civil|construction/.test(category)) return RECIPES.construction;
  if (/finance/.test(category)) return RECIPES.finance;
  if (/marketing/.test(category)) return RECIPES.marketing;
  if (/consulting|business/.test(category)) return RECIPES.consulting;
  if (/operations/.test(category)) return RECIPES.operations;
  if (/real estate/.test(category)) return RECIPES.realEstate;
  if (/health/.test(category)) return RECIPES.healthcare;
  if (/human resources/.test(category)) return RECIPES.hr;
  if (/legal|public sector/.test(category)) return RECIPES.legal;
  if (/design|ux/.test(category)) return RECIPES.design;
  if (/education/.test(category)) return RECIPES.education;
  if (/media|communications/.test(category)) return RECIPES.media;
  if (/retail/.test(category)) return RECIPES.retail;
  if (/research/.test(category)) return RECIPES.research;
  return RECIPES.software;
}

function recipe(
  scopeTitle: string,
  scopeObjective: string,
  buildTitle: string,
  buildObjective: string,
  validationTitle: string,
  validationObjective: string,
  buildVerb: string,
  validationMethod: string,
  resources: RoadmapResource[],
): Recipe {
  return {
    scopeTitle,
    scopeObjective,
    buildTitle,
    buildObjective,
    validationTitle,
    validationObjective,
    buildVerb,
    validationMethod,
    resources,
  };
}

export function estimateCatalogMinutes(value: string | null) {
  const text = String(value ?? "3-4 weeks").toLowerCase();
  if (text === "one semester") return 14 * 5 * 60;
  if (text === "48 hours") return 16 * 60;
  const numbers = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const average = numbers.length > 1 ? (numbers[0] + numbers[1]) / 2 : numbers[0] || 3.5;
  if (/month/.test(text)) return Math.round(average * 4.33 * 5 * 60);
  if (/week/.test(text)) return Math.round(average * 5 * 60);
  if (/day/.test(text)) return Math.round(average * 4 * 60);
  if (/hour/.test(text)) return Math.round(average * 60);
  return Math.round(average * 5 * 60);
}

function splitCsv(value: string | null) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function distinct(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function roundQuarterHour(value: number) {
  return Math.max(30, Math.round(value / 15) * 15);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
