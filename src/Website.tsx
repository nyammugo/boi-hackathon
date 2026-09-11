import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  LockKeyhole,
  Maximize2,
  Menu,
  MessageCircle,
  Minimize2,
  Minus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { App } from "./App";
import "./website.css";

const personal = "https://personalbanking.bankofireland.com";
const official = "https://www.bankofireland.com";
const products = [
  ["Current accounts", `${personal}/bank/current-accounts/`],
  ["Mortgages", `${personal}/borrow/mortgages/`],
  ["Loans", `${personal}/borrow/loans/`],
  ["Savings", `${personal}/save-and-invest/savings/`],
  ["Credit cards", `${personal}/borrow/credit-cards/`],
  ["Home and travel insurance", `${personal}/insure-and-protect/insurance/`],
  ["Life insurance", `${personal}/insure-and-protect/life-insurance/`],
  [
    "International payments",
    `${personal}/bank/international-payments/sending-money-abroad/`,
  ],
  ["Pensions", `${personal}/plan/pensions/`],
  ["Investments", `${personal}/save-and-invest/investments/`],
];
const support = [
  ["Help centre", `${official}/help-centre/`],
  ["Branch locator", `${official}/branch-locator/`],
  ["Security Zone", `${official}/security-zone/`],
  ["Extra support", `${personal}/financial-wellbeing/extra-help/`],
  ["Mortgage rates", `${personal}/borrow/mortgages/mortgage-interest-rates/`],
  ["Application forms", `${official}/help-centre/useful-application-forms/`],
  ["Tools and calculators", `${official}/help-centre/tools-and-calculators/`],
  ["Contact us", `${official}/help-centre/contact-us/`],
];

export function Website() {
  const [open, setOpen] = useState(Boolean(window.location.hash));
  const [started, setStarted] = useState(open);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = "Bank of Ireland — Plainly chat demo";
  }, []);

  useEffect(() => {
    if (!open) {
      if (started) launcher.current?.focus();
      return;
    }
    panel.current?.focus();
    const scroll = panel.current?.querySelector(".conversation-scroll");
    if (scroll?.querySelector(".message"))
      scroll.scrollTop = scroll.scrollHeight;
  }, [open, started]);

  useEffect(() => {
    if (!open || !expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, expanded]);

  function closeChat() {
    setOpen(false);
    setExpanded(false);
  }

  function showSection(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="bank-website">
      <div className="bank-page" inert={open && expanded}>
        <header className="bank-header">
          <div className="bank-utility">
            <details className="bank-site-picker">
              <summary>
                You are in: <strong>Personal</strong>
                <ChevronDown size={16} />
              </summary>
              <div>
                <a
                  href="https://businessbanking.bankofireland.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Business banking
                </a>
                <a
                  href="https://corporate.bankofireland.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Corporate banking
                </a>
              </div>
            </details>
            <a
              className="bank-logo"
              href="/website"
              aria-label="Bank of Ireland demo home"
            >
              <img
                src="/boi/logo.svg"
                alt="Bank of Ireland"
                width="80"
                height="96"
              />
            </a>
            <a
              className="bank-login"
              href="https://www.365online.com/"
              target="_blank"
              rel="noreferrer"
            >
              Log in/Register <LockKeyhole size={16} />
            </a>
            <button
              type="button"
              className="bank-mobile-menu"
              aria-label={
                menuOpen
                  ? "Close website navigation"
                  : "Open website navigation"
              }
              aria-expanded={menuOpen}
              aria-controls="bank-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          <nav
            id="bank-navigation"
            className={`bank-navigation ${menuOpen ? "is-open" : ""}`}
            aria-label="Bank of Ireland website"
          >
            <a href="/website">Home</a>
            <button type="button" onClick={() => showSection("bank-products")}>
              Products
            </button>
            <button type="button" onClick={() => showSection("bank-support")}>
              Services
            </button>
            <a
              href={`${personal}/financial-wellbeing/`}
              target="_blank"
              rel="noreferrer"
            >
              Financial Wellbeing
            </a>
            <a
              href={`${personal}/ways-to-bank/`}
              target="_blank"
              rel="noreferrer"
            >
              Ways to Bank
            </a>
            <button type="button" onClick={() => showSection("bank-support")}>
              Help &amp; Support
            </button>
            <button
              type="button"
              aria-expanded={searchOpen}
              aria-controls="bank-search"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              Search <Search size={18} />
            </button>
          </nav>
          {searchOpen && (
            <form
              id="bank-search"
              className="bank-search"
              onSubmit={(event) => {
                event.preventDefault();
                showSection("bank-products");
              }}
            >
              <label htmlFor="website-search">Find a product or service</label>
              <input
                id="website-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try savings or mortgages"
              />
              <button type="submit">
                Search <ArrowRight size={17} />
              </button>
            </form>
          )}
        </header>
        <main>
          <section className="bank-hero" aria-labelledby="bank-hero-title">
            <img
              className="bank-hero-image"
              src="/boi/smart-start.png"
              alt="A child enjoying an ice cream outdoors, with a Bank of Ireland card in his pocket."
              width="610"
              height="610"
              fetchPriority="high"
            />
            <div className="bank-hero-copy">
              <h1 id="bank-hero-title">Build their financial confidence</h1>
              <p>
                Help them take their first steps with money, with a Smart Start
                Account.
              </p>
              <a
                className="bank-primary-button"
                href={`${personal}/bank/current-accounts/smart-start-account/features-benefits/`}
                target="_blank"
                rel="noreferrer"
              >
                Explore Smart Start
              </a>
              <img
                className="bank-signature"
                src="/boi/right-with-you.svg"
                alt="Right with you"
                width="300"
                height="91"
              />
            </div>
          </section>
          <section className="bank-services" aria-label="Products and support">
            <div className="bank-services-grid">
              {[
                { title: "Our products", id: "bank-products", links: products },
                {
                  title: "Help and support",
                  id: "bank-support",
                  links: support,
                },
              ].map(({ title, id, links }) => {
                const matches = links.filter(([label]) =>
                  label.toLowerCase().includes(search.toLowerCase()),
                );
                return (
                  <section className="bank-link-card" id={id} key={id}>
                    <h2>{title}</h2>
                    {matches.length ? (
                      <ul>
                        {matches.map(([label, href]) => (
                          <li key={label}>
                            <a href={href} target="_blank" rel="noreferrer">
                              {label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No matches. Try another search.</p>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
          <section
            className="bank-features"
            aria-labelledby="bank-features-title"
          >
            <h2 id="bank-features-title">
              Here for your everyday, and your next big step.
            </h2>
            <div className="bank-feature-grid">
              <article>
                <img
                  src="/boi/mobile-app.png"
                  alt="Bank of Ireland mobile banking on a smartphone"
                  loading="lazy"
                />
                <div>
                  <h3>Banking that fits your day</h3>
                  <p>
                    Explore the ways you can manage your money, wherever you
                    are.
                  </p>
                  <a
                    href={`${personal}/ways-to-bank/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore digital banking <ArrowRight size={17} />
                  </a>
                </div>
              </article>
              <article>
                <img
                  src="/boi/mortgages.png"
                  alt="A model home against a blue background"
                  loading="lazy"
                />
                <div>
                  <h3>A place to call your own</h3>
                  <p>
                    Find information and tools to help you plan your next move.
                  </p>
                  <a
                    href={`${personal}/borrow/mortgages/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore mortgages <ArrowRight size={17} />
                  </a>
                </div>
              </article>
              <article>
                <img
                  src="/boi/wellbeing.png"
                  alt="A woman using a laptop and phone at home"
                  loading="lazy"
                />
                <div>
                  <h3>Make sense of your money</h3>
                  <p>
                    Build your knowledge and feel more confident about the
                    future.
                  </p>
                  <a
                    href={`${personal}/financial-wellbeing/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Financial wellbeing <ArrowRight size={17} />
                  </a>
                </div>
              </article>
            </div>
          </section>
        </main>
        <footer className="bank-footer">
          <span>Bank of Ireland · Hackathon website demo</span>
          <a href={official} target="_blank" rel="noreferrer">
            Visit the official website <ExternalLink size={13} />
          </a>
          <a href="/">
            Open Plainly workspace <ArrowRight size={14} />
          </a>
        </footer>
      </div>
      <div
        className={`chat-expand-backdrop ${open && expanded ? "is-active" : ""}`}
        aria-hidden="true"
      />
      {started && (
        <section
          ref={panel}
          id="plainly-live-chat"
          className={`chat-widget ${expanded ? "is-expanded" : ""}`}
          hidden={!open}
          role="dialog"
          aria-modal={expanded}
          aria-label="Plainly live chat"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (expanded) {
                setExpanded(false);
                event.currentTarget
                  .querySelector<HTMLButtonElement>(".chat-size-toggle")
                  ?.focus();
              } else closeChat();
            }
            if (expanded && event.key === "Tab") {
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled), a[href], textarea, input, [tabindex="0"]',
                ),
              ).filter((element) => element.getClientRects().length > 0);
              const first = controls[0];
              const last = controls.at(-1);
              if (
                event.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === panel.current)
              ) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <header className="chat-widget-header">
            <span className="chat-widget-mark">
              <MessageCircle size={24} />
            </span>
            <div>
              <h2>Plainly</h2>
            </div>
            <button
              type="button"
              className="chat-size-toggle"
              aria-label={expanded ? "Minimise to chat window" : "Expand chat"}
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              <span>{expanded ? "Minimise" : "Expand"}</span>
            </button>
            <button
              type="button"
              aria-label="Hide chat"
              title="Hide chat"
              onClick={closeChat}
            >
              <Minus size={21} />
            </button>
          </header>
          <App embedded={!expanded} active={open} />
        </section>
      )}
      <button
        type="button"
        ref={launcher}
        hidden={open && expanded}
        className={`chat-launcher ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls={started ? "plainly-live-chat" : undefined}
        aria-label={open ? "Close live chat" : "Open live chat"}
        onClick={() => {
          if (open) closeChat();
          else {
            setStarted(true);
            setOpen(true);
          }
        }}
      >
        {open ? (
          <X size={25} />
        ) : (
          <>
            <MessageCircle size={24} />
            <span>Let’s chat</span>
            <i />
          </>
        )}
      </button>
    </div>
  );
}
