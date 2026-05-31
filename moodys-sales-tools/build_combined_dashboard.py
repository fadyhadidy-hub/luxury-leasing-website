"""
Combine the two Moody's workbooks into ONE file + add sales-facing dashboards.
- Originals copied faithfully (unchanged content), renamed only to avoid tab collisions.
- New: Home, Dynamic Sales Dashboard (dropdown-driven), LOB Cheat Sheet.
"""
import copy
import openpyxl
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName

SRC_FRAMEWORK = "/home/user/Moodys_Underwriting_Intelligence_v2.xlsx"
SRC_IUE       = "/home/user/Moodys_IUE_Risk_Signal_Model.xlsx"
OUT           = "/home/user/Moodys_Underwriting_Sales_Hub.xlsx"

# ── Palette ────────────────────────────────────────────────────────────────────
C = {
    "moodys_dark":"1A1A2E","moodys_red":"CC0000","navy":"1B3A6B","dark_blue":"2C5282",
    "mid_blue":"3182CE","light_blue":"BEE3F8","pale_blue":"EBF8FF","green":"276749",
    "light_green":"C6F6D5","pale_green":"F0FFF4","amber":"B7791F","light_amber":"FEFCBF",
    "pale_amber":"FFFFF0","red_txt":"9B2335","light_red":"FED7D7","pale_red":"FFF5F5",
    "gray":"F7FAFC","gray_mid":"E2E8F0","white":"FFFFFF","gold":"D4AF37","purple":"553C9A",
    "light_purple":"E9D8FD","teal":"2C7A7B","ink":"222222","slate":"475569",
}
def fill(h): return PatternFill("solid", fgColor=h)
def F(bold=False, sz=10, color="222222", italic=False):
    return Font(bold=bold, size=sz, color=color, italic=italic, name="Calibri")
def A(h="left", v="center", wrap=True):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)
def bd(color="CBD5E0", style="thin"):
    s = Side(style=style, color=color); return Border(left=s,right=s,top=s,bottom=s)

# ══════════════════════════════════════════════════════════════════════════════
# 1. FAITHFUL CROSS-WORKBOOK SHEET COPIER
# ══════════════════════════════════════════════════════════════════════════════
def copy_sheet(src_ws, dst_wb, new_title):
    dst = dst_wb.create_sheet(new_title)
    # column widths / hidden
    for key, dim in src_ws.column_dimensions.items():
        d = dst.column_dimensions[key]
        if dim.width is not None: d.width = dim.width
        d.hidden = dim.hidden
    # row heights / hidden
    for key, dim in src_ws.row_dimensions.items():
        d = dst.row_dimensions[key]
        if dim.height is not None: d.height = dim.height
        d.hidden = dim.hidden
    # cells + styles
    for row in src_ws.iter_rows():
        for c in row:
            if c.value is None and not c.has_style:
                continue
            nc = dst.cell(row=c.row, column=c.column, value=c.value)
            if c.has_style:
                nc.font          = copy.copy(c.font)
                nc.fill          = copy.copy(c.fill)
                nc.border        = copy.copy(c.border)
                nc.alignment     = copy.copy(c.alignment)
                nc.number_format = c.number_format
                nc.protection    = copy.copy(c.protection)
    # merges
    for mc in list(src_ws.merged_cells.ranges):
        dst.merge_cells(str(mc))
    # view + props
    dst.sheet_view.showGridLines = src_ws.sheet_view.showGridLines
    try:
        dst.sheet_properties.tabColor = src_ws.sheet_properties.tabColor
    except Exception:
        pass
    if src_ws.freeze_panes:
        dst.freeze_panes = src_ws.freeze_panes
    return dst

# ══════════════════════════════════════════════════════════════════════════════
# 2. LOB SALES CONTENT
# ══════════════════════════════════════════════════════════════════════════════
LOBS = ["D&O", "E&O", "Surety", "Trade Credit", "General Liability", "Excess Casualty"]

CONTENT = {
 "D&O": {
   "tagline": "Protecting the people who run the company — and the company itself",
   "what": "Directors & Officers liability covers executives, board members and the entity against claims alleging wrongful acts in managing the organization — securities suits, breach of fiduciary duty, creditor and regulatory actions.",
   "who": "Public companies • PE-backed & private companies • Non-profits • SPACs • IPO candidates",
   "concerns": ("• Financial distress / going-concern risk\n• Governance quality (board independence, audit committee)\n"
                "• Prior claims & regulatory investigations\n• Securities-litigation exposure\n• M&A and SPAC activity"),
   "redflags": ("🚩 Going-concern audit opinion\n🚩 Active SEC / DOJ investigation\n"
                "🚩 Fraud-related financial restatement\n🚩 Sanctions hit on entity, UBO or executive"),
   "heroes": ("⭐ EDF-X — probability of default & early-warning signals, even for unrated private companies\n"
              "⭐ Orbis — financials, ownership tree & UBO for 625M+ companies\n"
              "⭐ RDC/GRID — sanctions, PEPs & adverse media, updated daily\n"
              "⭐ D&O Data — board composition, director tenure & executive intelligence"),
   "pain": ("Can't gauge private-company credit  →  EDF-X implied ratings\n"
            "Manual governance research  →  D&O Data board & exec profiles\n"
            "Missed regulatory red flags  →  RDC/GRID real-time enforcement monitoring"),
   "talking": ("• \"Your underwriters rebuild a company's financial & governance picture from scattered filings — we deliver it in seconds.\"\n"
               "• \"We flag credit deterioration 3–6 months before it hits the financials.\"\n"
               "• \"Every director, UBO and executive screened for sanctions, PEP status and adverse media — automatically.\""),
   "killer": ("• \"Any financial restatements in the last 5 years?\"\n"
              "• \"Any pending regulatory investigations or securities litigation?\"\n"
              "• \"Is the entity rated — and if not, do you know its implied credit quality?\""),
   "stat": "46%  —  rise in Chapter 11 filings (12 mths to mid-2024), fueling securities litigation",
   "adv": 5,
 },
 "E&O": {
   "tagline": "When professional advice or services go wrong",
   "what": "Errors & Omissions / Professional Liability covers firms against claims of negligent acts, errors or omissions in delivering professional services — increasingly including data breaches and AI-driven errors.",
   "who": "Tech companies • Law firms • Accountants • Architects & engineers • Financial advisers • Consultants • Healthcare professionals",
   "concerns": ("• Regulatory & disciplinary history of principals\n• Cyber & client-data exposure\n"
                "• Prior E&O claims & near-misses\n• Client concentration\n• Financial stability of the firm"),
   "redflags": ("🚩 Active license suspension / revocation\n🚩 Fraud-related prior claim\n"
                "🚩 Prior data breach + weak BitSight score\n🚩 No engagement letters / no QA framework"),
   "heroes": ("⭐ BitSight — external cyber risk score, ~40% more accurate claim prediction\n"
              "⭐ RDC/GRID — regulatory, disciplinary & adverse-media screening\n"
              "⭐ EDF-X — private-company financial health & PD\n"
              "⭐ Orbis — firm profile, revenue & client intelligence"),
   "pain": ("Cyber exposure invisible at UW  →  BitSight outside-in scan\n"
            "Disciplinary history scattered  →  RDC/GRID consolidated screen\n"
            "No financials for private firms  →  EDF-X private model"),
   "talking": ("• \"Tech & professional firms live and die by their cyber posture — we score it from the outside in, no questionnaire needed.\"\n"
               "• \"We screen every principal against global regulatory & disciplinary databases instantly.\"\n"
               "• \"Most E&O firms are private with no public financials — EDF-X gives you a credit read anyway.\""),
   "killer": ("• \"Do any principals have disciplinary history with their licensing board?\"\n"
              "• \"Does the firm hold sensitive client data — and how is it protected?\"\n"
              "• \"Are AI tools used in client deliverables?\""),
   "stat": "40%  —  improvement in claim-prediction accuracy when BitSight cyber data is added",
   "adv": 4,
 },
 "Surety": {
   "tagline": "Credit, not insurance — backing a principal's promise to perform",
   "what": "Surety bonds guarantee a principal (contractor / licensee) will fulfil an obligation to an obligee. The surety expects zero losses and relies on indemnity — so it is fundamentally a credit decision.",
   "who": "General contractors • Specialty subcontractors • Developers • Licensed professionals • Court & license bond principals",
   "concerns": ("• Working capital & tangible net worth\n• Trade-payment behavior (do they pay subs on time?)\n"
                "• Backlog size & gross-margin fade\n• Liens, judgments & UCC filings\n• Banking relationship & liquidity"),
   "redflags": ("🚩 Negative working capital\n🚩 Negative gross profit in backlog\n"
                "🚩 Active bond claim or obligee dispute\n🚩 Unsatisfied tax lien or judgment"),
   "heroes": ("⭐ Cortera — trade-payment behavior, CPR credit score, liens, judgments, UCC & DOT data\n"
              "⭐ EDF-X — early-warning signals on credit deterioration\n"
              "⭐ Orbis — CPA-grade financials & ownership\n"
              "⭐ RDC/GRID — principal & UBO screening"),
   "pain": ("Financials are a lagging indicator  →  Cortera real-time payment behavior\n"
            "Manual lien / judgment searches  →  Cortera public-records data\n"
            "Distress detected too late  →  EDF-X early-warning flags"),
   "talking": ("• \"Surety is a credit decision — and credit is exactly what Moody's does best.\"\n"
               "• \"We see how a contractor actually pays its subs and suppliers, in real time, through Cortera's $1.45T network.\"\n"
               "• \"Tax liens, judgments and UCC filings surfaced automatically — no manual public-records search.\""),
   "killer": ("• \"How does the principal pay its subcontractors — on time?\"\n"
              "• \"What's the working capital relative to the bonding program?\"\n"
              "• \"Any liens, judgments or prior bond claims?\""),
   "stat": "$1.45T  —  annual B2B payment history in Cortera's contributory network",
   "adv": 5,
 },
 "Trade Credit": {
   "tagline": "Insuring the money your client is owed",
   "what": "Trade Credit insurance protects sellers against buyer non-payment from insolvency or protracted default — plus political and currency-transfer risk on export trade.",
   "who": "Exporters • Manufacturers • Distributors & wholesalers • Banks with trade-finance books • Factoring companies",
   "concerns": ("• Buyer-portfolio credit quality\n• Country & political risk\n"
                "• Buyer concentration (single-name risk)\n• Payment trends (DSO / Days-Beyond-Terms)\n• Policyholder moral hazard"),
   "redflags": ("🚩 Sanctioned buyer or buyer country\n🚩 Buyer insolvency filing\n"
                "🚩 Single buyer >50% of the portfolio\n🚩 Distressed policyholder (adverse selection)"),
   "heroes": ("⭐ EDF-X — PD & implied ratings across the entire buyer portfolio (rated or not)\n"
              "⭐ Cortera — buyer payment behavior & delinquency signals\n"
              "⭐ Economy.com + Ratings — sovereign & country risk\n"
              "⭐ RDC/GRID — buyer & UBO sanctions screening"),
   "pain": ("Unrated foreign buyers  →  EDF-X implied ratings globally\n"
            "Default surprises  →  Cortera payment-slowdown alerts\n"
            "Country-risk guesswork  →  Moody's sovereign ratings + Economy.com"),
   "talking": ("• \"We can credit-score an entire buyer portfolio — including unrated SMEs anywhere in the world.\"\n"
               "• \"Cortera shows you which buyers are slowing their payments before they default.\"\n"
               "• \"Moody's sovereign ratings and Economy.com forecasts price country risk precisely.\""),
   "killer": ("• \"What's the credit-quality spread across the buyer portfolio?\"\n"
              "• \"Which countries are the buyers in?\"\n"
              "• \"How concentrated is the receivables book?\""),
   "stat": "625M+  —  companies Moody's can credit-assess worldwide, rated or unrated",
   "adv": 5,
 },
 "General Liability": {
   "tagline": "Third-party injury & property damage — the workhorse of casualty",
   "what": "Commercial General Liability covers bodily injury, property damage, personal/advertising injury and products/completed-operations liability to third parties.",
   "who": "Virtually every commercial business — contractors • manufacturers • retailers • restaurants • tech • healthcare • hospitality",
   "concerns": ("• Operations hazard & mass-tort exposure\n• Jurisdiction / venue (judicial hellholes)\n"
                "• Loss history (frequency & severity)\n• Products liability\n• Safety record & risk management"),
   "redflags": ("🚩 Confirmed PFAS / high-probability mass-tort agent\n🚩 Active mass-tort lawsuit\n"
                "🚩 OSHA willful violation\n🚩 Imported goods with no domestic manufacturer"),
   "heroes": ("⭐ Praedicat — mass-tort / emerging-liability (Litagion®) screening & PML\n"
              "⭐ Orbis — operations verification & SIC/NAICS cross-check\n"
              "⭐ Cortera — credit, DOT safety & public records\n"
              "⭐ Economy.com — jurisdiction & social-inflation context"),
   "pain": ("Latent mass-tort exposure invisible  →  Praedicat Litagion® screen\n"
            "Misrepresented operations  →  Orbis NAICS cross-check\n"
            "Nuclear-verdict surprise  →  Praedicat + Economy.com venue analytics"),
   "talking": ("• \"We screen products & operations against 100+ mass-tort agents — PFAS, talc, opioids — before they become a claim.\"\n"
               "• \"Nuclear verdicts hit $31.3B in 2024. We map jurisdiction & industry litigation risk so your team prices for it.\"\n"
               "• \"Stated operations are cross-checked against Orbis — brokers can't hide a hazardous exposure.\""),
   "killer": ("• \"What exactly do they manufacture or sell — and from what materials?\"\n"
              "• \"Which states is the payroll / revenue concentrated in?\"\n"
              "• \"Any products containing chemicals of concern?\""),
   "stat": "$31.3B  —  total nuclear-verdict awards in 2024 (up 116% year-on-year)",
   "adv": 4,
 },
 "Excess Casualty": {
   "tagline": "The high-severity layer — where nuclear verdicts live",
   "what": "Excess & Umbrella liability provides additional limits over primary policies (GL, Auto, Employers Liability), built for catastrophic, high-severity loss events.",
   "who": "Mid-to-large commercial accounts • High-hazard industries • Public companies • Construction programs • Multinationals",
   "concerns": ("• Catastrophic / PML exposure\n• Social inflation & nuclear verdicts\n"
                "• Underlying program quality & primary-carrier strength\n• Loss development\n• Mass-tort accumulation"),
   "redflags": ("🚩 Active mass-tort defendant\n🚩 Prior sexual-abuse & molestation (SAM) claim\n"
                "🚩 Primary carrier below investment grade\n🚩 Modeled PML >10× attachment point"),
   "heroes": ("⭐ Praedicat — stochastic casualty PML & mass-tort accumulation\n"
              "⭐ Economy.com — social-inflation & nuclear-verdict analytics\n"
              "⭐ Ratings — primary-carrier financial strength\n"
              "⭐ EDF-X — insured financial stability"),
   "pain": ("Attachment-point guesswork  →  Praedicat stochastic PML\n"
            "Social-inflation blind spot  →  Economy.com venue analytics\n"
            "Drop-down from a weak primary  →  Moody's carrier ratings"),
   "talking": ("• \"Praedicat models the probable maximum loss stochastically — so your team knows if the attachment point is mispriced.\"\n"
               "• \"Social inflation hit a 20-year high. We quantify nuclear-verdict and litigation-funding risk by industry and venue.\"\n"
               "• \"We rate the primary carrier's financial strength so you know your drop-down risk.\""),
   "killer": ("• \"What's the realistic worst-case loss for this risk?\"\n"
              "• \"What jurisdictions and industries drive the exposure?\"\n"
              "• \"Who's the primary carrier and how strong are they?\""),
   "stat": "7%  —  social inflation in 2023, a 20-year high, outpacing economic inflation",
   "adv": 4,
 },
}

# field → row in _DashData
FIELD_ROWS = {
    "tagline":2,"what":3,"who":4,"concerns":5,"redflags":6,
    "heroes":7,"pain":8,"talking":9,"killer":10,"stat":11,"adv":12,
}

# ══════════════════════════════════════════════════════════════════════════════
# 3. BUILD COMBINED WORKBOOK
# ══════════════════════════════════════════════════════════════════════════════
wb = openpyxl.Workbook()
wb.remove(wb.active)
wb.calculation.fullCalcOnLoad = True

# ── 3a. Backing data sheet (very-hidden equivalent: state="hidden") ────────────
dd = wb.create_sheet("_DashData")
dd.sheet_state = "hidden"
dd.cell(row=1, column=1, value="field")
for ci, lob in enumerate(LOBS, start=2):
    dd.cell(row=1, column=ci, value=lob)
for field, r in FIELD_ROWS.items():
    dd.cell(row=r, column=1, value=field)
    for ci, lob in enumerate(LOBS, start=2):
        dd.cell(row=r, column=ci, value=CONTENT[lob][field])

# Named range so DataValidation can reference the LOB list without cross-sheet issues
dn = DefinedName("_LobList", attr_text="_DashData!$B$1:$G$1")
wb.defined_names["_LobList"] = dn

# ══════════════════════════════════════════════════════════════════════════════
# 3b. HOME / NAVIGATION
# ══════════════════════════════════════════════════════════════════════════════
home = wb.create_sheet("🏠 Home")
home.sheet_view.showGridLines = False
for col, w in [(1,4),(2,30),(3,30),(4,30),(5,30),(6,4)]:
    home.column_dimensions[get_column_letter(col)].width = w

def hcell(ws,r,c,v,bg=None,fg="222222",bold=False,sz=10,h="left",italic=False,border=False,merge=None,wrap=True):
    if merge: ws.merge_cells(start_row=r,start_column=c,end_row=r,end_column=merge)
    cell=ws.cell(row=r,column=c,value=v)
    cell.font=F(bold=bold,sz=sz,color=fg,italic=italic)
    if bg: cell.fill=fill(bg)
    cell.alignment=A(h=h,wrap=wrap)
    if border: cell.border=bd()
    return cell

home.row_dimensions[1].height=10
home.row_dimensions[2].height=44
hcell(home,2,2,"  Moody's  ×  Underwriting  —  Sales Enablement Hub",C["moodys_dark"],C["white"],True,18,merge=5)
home.row_dimensions[3].height=22
hcell(home,3,2,"  Everything your team needs to talk credibly about Casualty & Financial Lines — and where Moody's data wins the conversation",C["navy"],C["light_blue"],italic=True,sz=10,merge=5)
home.row_dimensions[4].height=4
hcell(home,4,2,"",C["gold"],merge=5)

home.row_dimensions[6].height=16
hcell(home,6,2,"  WHAT'S IN THIS WORKBOOK",C["mid_blue"],C["white"],True,10,merge=5)

cards=[
 ("📊  Sales Dashboard","START HERE","Pick any line of business from the dropdown and the whole one-page brief updates live — what it is, what underwriters worry about, the deal-breakers, Moody's hero products, talking points and the killer questions to ask.","Use it live in a client meeting."),
 ("📇  LOB Cheat Sheet","QUICK GLANCE","All six lines of business side-by-side on a single page. Perfect for a fast scan before a call or to compare where Moody's data matters most across the portfolio.","Screenshot it. Keep it open."),
 ("📋  Data Map (9 tabs)","THE DETAIL","The full mapping of every underwriting data point to the Moody's product that serves it — per LOB. This is your evidence base when an underwriter asks \"can you really do X?\"","Reference when you need depth."),
 ("🎯  Risk Model (9 tabs)","THE VISION","The Intelligent Underwriting Engine design — how Moody's data becomes a real-time risk signal that triages submissions. Use this to sell the bigger transformation story.","For strategic conversations."),
]
r=7
for title,tag,desc,foot in cards:
    home.row_dimensions[r].height=24
    hcell(home,r,2,f"  {title}",C["pale_blue"],C["navy"],True,12,merge=4,border=True)
    hcell(home,r,5,tag,C["gold"],C["moodys_dark"],True,9,h="center",border=True)
    home.row_dimensions[r+1].height=52
    hcell(home,r+1,2,"  "+desc,C["white"],C["ink"],sz=9.5,merge=4,border=True)
    hcell(home,r+1,5,foot,C["pale_amber"],C["amber"],italic=True,sz=8.5,h="center",border=True)
    r+=2

home.row_dimensions[r].height=8
r+=1
home.row_dimensions[r].height=16
hcell(home,r,2,"  HOW TO USE THE DYNAMIC DASHBOARD",C["mid_blue"],C["white"],True,10,merge=5)
r+=1
for step in [
  "1.  Open the  📊 Sales Dashboard  tab.",
  "2.  Click the highlighted dropdown cell and choose the line of business you're discussing.",
  "3.  The entire page updates instantly — read straight off it in the meeting.",
  "4.  Need proof points? Jump to that LOB's  · Data Map  tab. Selling the vision? Use the  · Risk Model  tab.",
]:
    home.row_dimensions[r].height=18
    hcell(home,r,2,"   "+step,C["pale_green"] if r%2==0 else C["white"],C["ink"],sz=9.5,merge=5)
    r+=1
home.sheet_properties.tabColor=C["moodys_dark"]

# ══════════════════════════════════════════════════════════════════════════════
# 3c. DYNAMIC SALES DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
dash = wb.create_sheet("📊 Sales Dashboard")
dash.sheet_view.showGridLines = False
for col, w in [(1,23),(2,23),(3,23),(4,23),(5,23),(6,23)]:
    dash.column_dimensions[get_column_letter(col)].width = w

def mrg(r,c1,c2): dash.merge_cells(start_row=r,start_column=c1,end_row=r,end_column=c2)
def dput(r,c,v,bg=None,fg="222222",bold=False,sz=10,h="left",italic=False,border=False,va="center",wrap=True):
    cell=dash.cell(row=r,column=c,value=v)
    cell.font=F(bold=bold,sz=sz,color=fg,italic=italic)
    if bg: cell.fill=fill(bg)
    cell.alignment=Alignment(horizontal=h,vertical=va,wrap_text=wrap)
    if border: cell.border=bd()
    return cell

def idx(field):
    rr=FIELD_ROWS[field]
    return f"=INDEX(_DashData!$B${rr}:$G${rr},MATCH($C$4,_DashData!$B$1:$G$1,0))"

# Banner
dash.row_dimensions[1].height=42
mrg(1,1,6); dput(1,1,"  Line-of-Business Sales Brief",C["moodys_dark"],C["white"],True,17,h="left")
dash.row_dimensions[2].height=20
mrg(2,1,6); dput(2,1,"  Pick a line of business → the entire brief updates. Read it straight off the page in your meeting.",C["navy"],C["light_blue"],italic=True,sz=9.5)
dash.row_dimensions[3].height=6
mrg(3,1,6); dput(3,1,"",C["gold"])

# Selector
dash.row_dimensions[4].height=34
mrg(4,1,2); dput(4,1,"  ▶  SELECT LINE OF BUSINESS:",C["gold"],C["moodys_dark"],True,12,h="right")
mrg(4,3,6); sel=dput(4,3,"D&O","FFFFFF",C["moodys_red"],True,16,h="center",border=True)
sel.border=bd(color=C["moodys_red"],style="medium")
# Use inline list — most reliable across Excel versions and LibreOffice
dv=DataValidation(type="list",formula1='"D&O,E&O,Surety,Trade Credit,General Liability,Excess Casualty"',allow_blank=False,showDropDown=False)
dv.prompt="Choose a line of business"; dv.promptTitle="Line of Business"
dash.add_data_validation(dv); dv.add(dash["C4"])

# Dynamic title + tagline
dash.row_dimensions[5].height=6
dash.row_dimensions[6].height=30
mrg(6,1,6); t=dput(6,1,"=$C$4",C["dark_blue"],C["white"],True,16,h="left");
dash.row_dimensions[7].height=20
mrg(7,1,6); dput(7,1,idx("tagline"),C["pale_blue"],C["navy"],italic=True,sz=11,h="left")
dash.row_dimensions[8].height=8

# Card grid helper: header row + content row, two columns (A:C , D:F)
def card_pair(hr, left_title, left_field, right_title, right_field,
              left_bg, right_bg, content_h=150, lfg=C["white"], rfg=C["white"]):
    dash.row_dimensions[hr].height=20
    mrg(hr,1,3); dput(hr,1,"  "+left_title,left_bg,lfg,True,10)
    mrg(hr,4,6); dput(hr,4,"  "+right_title,right_bg,rfg,True,10)
    cr=hr+1
    dash.row_dimensions[cr].height=content_h
    mrg(cr,1,3); dput(cr,1,idx(left_field),C["white"],C["ink"],sz=9.5,va="top",border=True)
    mrg(cr,4,6); dput(cr,4,idx(right_field),C["white"],C["ink"],sz=9.5,va="top",border=True)

card_pair(9 ,"📌  WHAT IT IS","what","👥  WHO BUYS IT","who",
          C["navy"],C["dark_blue"],content_h=70)
card_pair(11,"😰  WHAT KEEPS THE UNDERWRITER UP AT NIGHT","concerns","🚩  DEAL-BREAKERS (RED FLAGS)","redflags",
          C["dark_blue"],C["red_txt"],content_h=110)
card_pair(13,"⭐  MOODY'S HERO PRODUCTS","heroes","🔧  UNDERWRITER PAIN  →  MOODY'S FIX","pain",
          C["moodys_red"],C["green"],content_h=120)
card_pair(15,"💬  CONVERSATION STARTERS","talking","🎯  KILLER QUESTIONS TO ASK","killer",
          C["teal"],C["amber"],content_h=130)

# By the numbers + data advantage bar
dash.row_dimensions[17].height=8
dash.row_dimensions[18].height=20
mrg(18,1,6); dput(18,1,"  📈  BY THE NUMBERS",C["mid_blue"],C["white"],True,10)
dash.row_dimensions[19].height=40
mrg(19,1,4); dput(19,1,idx("stat"),C["pale_amber"],C["amber"],True,12,h="center",border=True)
adv_formula=('=REPT("●",INDEX(_DashData!$B$12:$G$12,MATCH($C$4,_DashData!$B$1:$G$1,0)))'
             '&REPT("○",5-INDEX(_DashData!$B$12:$G$12,MATCH($C$4,_DashData!$B$1:$G$1,0)))')
mrg(19,5,6)
db=dput(19,5,adv_formula,C["pale_green"],C["green"],True,14,h="center",border=True)
# small caption under bar via comment-like row
dash.row_dimensions[20].height=16
mrg(20,5,6); dput(20,5,"Moody's data advantage for this LOB",C["white"],C["slate"],italic=True,sz=8,h="center")
mrg(20,1,4); dput(20,1,"Sources: Moody's product disclosures; NAIC; industry litigation data (2024–25)",C["white"],C["slate"],italic=True,sz=8,h="left")

# ── Resources / Links section ─────────────────────────────────────────────────
dash.row_dimensions[21].height=8
dash.row_dimensions[22].height=20
mrg(22,1,6); dput(22,1,"  🔗  MOODY'S RESOURCES & LINKS",C["dark_blue"],C["white"],True,10)

LINKS=[
  ("Orbis","Company data: 625M+ cos, financials & ownership",
   "https://www.moodys.com/web/en/us/capabilities/company-reference-data/orbis.html"),
  ("RDC/GRID","Sanctions, PEPs & adverse media — KYC screening",
   "https://www.moodys.com/web/en/us/kyc/products/grid.html"),
  ("EDF-X","PD scores & early-warning signals — rated & unrated",
   "https://www.moodysanalytics.com/product-list/edfx"),
  ("Cortera","$1.45T B2B payment network — trade credit & surety",
   "https://www.moodys.com/web/en/us/capabilities/company-reference-data/data-applications/trade-credit.html"),
  ("BitSight","Outside-in cyber risk — 40%+ claim accuracy lift",
   "https://www.bitsight.com/products/bitsight-for-cyber-insurance"),
  ("Praedicat","Mass-tort & casualty PML — Litagion® agent screen",
   "https://www.moodys.com/web/en/us/solutions/casualty-insurance.html"),
  ("RMS","Catastrophe & forward-looking casualty risk models",
   "https://www.moodys.com/web/en/us/capabilities/catastrophe-modeling/forward-looking-view-risk.html"),
  ("Economy.com","Country risk, GDP & social-inflation analytics",
   "https://www.economy.com/"),
  ("CreditView","Moody's ratings research & analytics platform",
   "https://www.moodys.com/web/en/us/capabilities/credit-risk/creditview.html"),
  ("Casualty Solutions","D&O, GL, Excess & specialty casualty overview",
   "https://www.moodys.com/web/en/us/solutions/casualty-insurance.html"),
  ("Financial Lines","D&O, E&O, cyber financial lines solutions",
   "https://www.moodys.com/web/en/us/solutions/financial-lines.html"),
  ("D&O Research","Moody's boardroom risk series — part 1",
   "https://www.moodys.com/web/en/us/insights/insurance/d-o-series-evolving-risks-in-the-boardroom-a-new-era-of-d-o-liability-part-1.html"),
]

# Two-column link table: columns A-C | D-F
r_lnk=23
for i,(_name,_desc,_url) in enumerate(LINKS):
    col_start = 1 if i%2==0 else 4
    col_end   = 3 if i%2==0 else 6
    if i%2==0:
        dash.row_dimensions[r_lnk].height=26
    mrg(r_lnk,col_start,col_start+1)
    lc = dash.cell(row=r_lnk, column=col_start, value=_name)
    lc.hyperlink = _url
    lc.font = Font(bold=True, underline="single", color="2563EB", size=10, name="Calibri")
    lc.fill = fill(C["pale_blue"]); lc.alignment = A("left",wrap=False); lc.border=bd()
    dc = dash.cell(row=r_lnk, column=col_start+2, value=_desc)
    dc.font = F(sz=8.5, color=C["slate"]); dc.fill = fill(C["gray"]); dc.alignment = A("left"); dc.border=bd()
    if i%2==1:
        r_lnk+=1

dash.sheet_properties.tabColor=C["moodys_red"]
dash.freeze_panes="A5"

# ══════════════════════════════════════════════════════════════════════════════
# 3d. LOB CHEAT SHEET (static, all six side by side)
# ══════════════════════════════════════════════════════════════════════════════
cheat = wb.create_sheet("📇 LOB Cheat Sheet")
cheat.sheet_view.showGridLines=False
cheat_cols=[(1,18),(2,38),(3,26),(4,30),(5,40),(6,34)]
for col,w in cheat_cols: cheat.column_dimensions[get_column_letter(col)].width=w

cheat.row_dimensions[1].height=40
cheat.merge_cells("A1:F1")
cput=cheat.cell(row=1,column=1,value="  LOB Cheat Sheet  —  All Six Lines at a Glance")
cput.font=F(True,16,C["white"]); cput.fill=fill(C["moodys_dark"]); cput.alignment=A("left",wrap=False)
cheat.row_dimensions[2].height=18
cheat.merge_cells("A2:F2")
c2=cheat.cell(row=2,column=1,value="  A fast scan before any call — what each line is, who buys it, the #1 underwriter concern, Moody's hero products, and the one question to ask")
c2.font=F(italic=True,sz=9,color=C["light_blue"]); c2.fill=fill(C["navy"]); c2.alignment=A("left",wrap=False)
cheat.row_dimensions[3].height=4; cheat.merge_cells("A3:F3"); cheat["A3"].fill=fill(C["gold"])

heads=["Line of Business","What It Is","Who Buys It","#1 Underwriter Concern","Moody's Hero Products","The One Question to Ask"]
cheat.row_dimensions[4].height=26
for ci,h in enumerate(heads,1):
    cc=cheat.cell(row=4,column=ci,value=h)
    cc.font=F(True,9.5,C["white"]); cc.fill=fill(C["navy"]); cc.alignment=A("center",wrap=True); cc.border=bd()

# condensed per-LOB content
cheat_rows={
 "D&O":("Exec/board & entity cover for wrongful acts in running the company — securities suits, fiduciary breach.",
        "Public & private cos, NFPs, SPACs, IPO candidates",
        "Financial distress / going-concern + governance quality",
        "EDF-X • Orbis • RDC/GRID • D&O Data",
        "\"Any restatements or regulatory investigations in the last 5 years?\""),
 "E&O":("Professional liability for negligent acts, errors or omissions — now incl. cyber & AI errors.",
        "Tech, law, accounting, A&E, advisers, consultants, healthcare",
        "Regulatory/disciplinary history + cyber & data exposure",
        "BitSight • RDC/GRID • EDF-X • Orbis",
        "\"Does the firm hold sensitive client data — and how is it protected?\""),
 "Surety":("Bond guaranteeing a principal performs an obligation. A credit decision, backed by indemnity.",
        "GCs, subcontractors, developers, licensed principals",
        "Capital (working capital/net worth) + how they pay subs",
        "Cortera • EDF-X • Orbis • RDC/GRID",
        "\"How does the principal pay its subcontractors — on time?\""),
 "Trade Credit":("Protects sellers against buyer non-payment from insolvency/default + political risk.",
        "Exporters, manufacturers, distributors, trade-finance banks",
        "Buyer-portfolio credit quality + country/political risk",
        "EDF-X • Cortera • Economy.com • Ratings",
        "\"What's the credit-quality spread and country mix of the buyers?\""),
 "General Liability":("Third-party bodily injury, property damage & products/completed-ops liability.",
        "Nearly every commercial business",
        "Operations hazard / mass-tort exposure + venue risk",
        "Praedicat • Orbis • Cortera • Economy.com",
        "\"What do they make or sell, and from what materials?\""),
 "Excess Casualty":("Extra limits over primary policies — built for catastrophic, high-severity losses.",
        "Mid-large commercial, high-hazard industries, multinationals",
        "Catastrophic PML + social inflation / nuclear verdicts",
        "Praedicat • Economy.com • Ratings • EDF-X",
        "\"What's the realistic worst-case loss and what drives it?\""),
}
lob_tab_clr={"D&O":"2C5282","E&O":"2D3748","Surety":"276749","Trade Credit":"744210","General Liability":"7B341E","Excess Casualty":"702459"}
r=5
for i,lob in enumerate(LOBS):
    whatit,who,concern,heroes,q=cheat_rows[lob]
    cheat.row_dimensions[r].height=66
    vals=[lob,whatit,who,concern,heroes,q]
    for ci,v in enumerate(vals,1):
        cc=cheat.cell(row=r,column=ci,value=v)
        if ci==1:
            cc.font=F(True,10,C["white"]); cc.fill=fill(lob_tab_clr[lob])
            cc.alignment=A("center",wrap=True)
        elif ci==5:
            cc.font=F(True,8.5,C["moodys_red"]); cc.fill=fill(C["pale_red"]); cc.alignment=A(wrap=True)
        elif ci==6:
            cc.font=F(True,8.5,C["amber"],italic=True); cc.fill=fill(C["pale_amber"]); cc.alignment=A(wrap=True)
        else:
            cc.font=F(sz=8.5); cc.fill=fill(C["pale_blue"] if i%2==0 else C["white"]); cc.alignment=A(wrap=True)
        cc.border=bd()
    r+=1
cheat.freeze_panes="A5"; cheat.sheet_properties.tabColor=C["gold"]

# ══════════════════════════════════════════════════════════════════════════════
# 4. COPY ORIGINAL SHEETS (unchanged) WITH COLLISION-SAFE RENAMING
# ══════════════════════════════════════════════════════════════════════════════
wb_fw  = load_workbook(SRC_FRAMEWORK)
wb_iue = load_workbook(SRC_IUE)

# framework renames
fw_rename = {
  "📋 Overview":"📋 Data Map · Overview",
  "📦 Moody's Data Catalog":"📦 Data Catalog",
  "🗺️ Coverage Map":"🗺️ Coverage Map",
  "D&O":"D&O · Data Map",
  "E&O":"E&O · Data Map",
  "Surety":"Surety · Data Map",
  "Trade Credit":"Trade Credit · Data Map",
  "General Liability":"General Liability·Data Map",
  "Excess Casualty":"Excess Casualty · Data Map",
}
fw_order = ["📋 Overview","📦 Moody's Data Catalog","🗺️ Coverage Map",
            "D&O","E&O","Surety","Trade Credit","General Liability","Excess Casualty"]
for name in fw_order:
    if name in wb_fw.sheetnames:
        copy_sheet(wb_fw[name], wb, fw_rename[name][:31])

# IUE renames
iue_rename = {
  "🎯 Strategy & Architecture":"🎯 Strategy & Architecture",
  "D&O":"D&O · Risk Model",
  "Trade Credit":"Trade Credit · Risk Model",
  "Surety":"Surety · Risk Model",
  "General Liability":"General Liability·Risk Model",
  "Excess Casualty":"Excess Casualty · Risk Model",
  "E&O":"E&O · Risk Model",
  "🔬 Stress Tests":"🔬 Stress Tests",
  "🚀 Roadmap & ROI":"🚀 Roadmap & ROI",
}
iue_order = ["🎯 Strategy & Architecture","D&O","Trade Credit","Surety",
             "General Liability","Excess Casualty","E&O","🔬 Stress Tests","🚀 Roadmap & ROI"]
for name in iue_order:
    if name in wb_iue.sheetnames:
        copy_sheet(wb_iue[name], wb, iue_rename[name][:31])

# ── Final tab ordering: dashboards first, then data map, then risk model ──────
desired_first = ["🏠 Home","📊 Sales Dashboard","📇 LOB Cheat Sheet"]
for i,name in enumerate(desired_first):
    if name in wb.sheetnames:
        wb.move_sheet(name, offset=i-wb.sheetnames.index(name))

wb.save(OUT)
print("✅ Saved:",OUT)
print("Total tabs:",len(wb.sheetnames))
for s in wb.sheetnames:
    print("  -",s,"(hidden)" if wb[s].sheet_state=="hidden" else "")
