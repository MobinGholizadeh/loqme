/* eslint-disable @typescript-eslint/no-explicit-any -- Store responses are checked by status and rendered by action-specific consumers. */
import { useEffect, useState, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Search,
  X,
  Plus,
  Play,
  SlidersHorizontal,
  Check,
  Copy,
  Download,
  Wallet,
  Upload,
  ExternalLink,
  Settings,
  Grid2X2,
  Package,
  LoaderCircle,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLenis } from '../components/smooth-scroll-provider';
import { samples, type Product } from '../lib/samples';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const categories = ['All work', 'Websites', 'Motion', '3D & Visuals', 'Templates', 'Free'];
const money = (n: number) =>
  n === 0 ? 'Free' : `${(n / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`;

async function api(action: string, data?: unknown) {
  const r = await fetch(
    `/api/store.php${action ? '?action=' + action : ''}`,
    data
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      : {}
  );
  const b: any = await r.json();
  if (!r.ok) throw new Error(b.error || 'Please try again.');
  return b;
}

function Art({ p, large = false }: { p: Product; large?: boolean }) {
  return p.preview ? (
    p.media_type === 'video' ? (
      <video src={p.preview} controls={large} muted={!large} playsInline preload="metadata" />
    ) : (
      <img src={p.preview} alt={p.title} loading="lazy" />
    )
  ) : (
    <div className={`art ${p.art}`}>
      <div className="mini-nav">
        <span>{p.art === 'forma' ? 'forma®' : p.title.toLowerCase()}</span>
        <span>INDEX &nbsp; ABOUT &nbsp; ↗</span>
      </div>
      {p.art === 'monolith' ? (
        <>
          <div className="mini-landscape" />
          <div className="mini-title">
            Beyond the
            <br />
            known.
          </div>
          <span className="mini-footer">A NEW PERSPECTIVE ON DIGITAL.</span>
        </>
      ) : p.art === 'orbital' ? (
        <>
          <div className="orb" />
          <div className="orb-label">
            Ideas in
            <br />
            <em>constant motion.</em>
          </div>
        </>
      ) : p.art === 'forma' ? (
        <>
          <div className="forma-title">
            Independent
            <br />
            by design<span>®</span>
          </div>
          <div className="forma-block">f.</div>
          <span className="mini-footer">STRATEGY. DESIGN. A LITTLE INTUITION.</span>
        </>
      ) : p.art === 'chrome' ? (
        <>
          <div className="chrome-object" />
          <span className="chrome-title">
            LIQUID
            <br />
            MATTER.
          </span>
          <span className="mini-footer">EXPERIMENT 004 — CHROME STUDY</span>
        </>
      ) : p.art === 'offgrid' ? (
        <>
          <div className="off-title">
            OFF—
            <br />
            <i>GRID</i>
            <span>↗</span>
          </div>
          <span className="mini-footer">IDEAS THAT DON&#39;T FIT THE TEMPLATE.</span>
        </>
      ) : (
        <>
          <div className="field-lines" />
          <div className="field-title">
            Field
            <br />
            notes <span>01</span>
          </div>
          <span className="mini-footer">AN EXPLORATION IN TYPE & SPACE</span>
        </>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { lenis } = useLenis();

  useEffect(() => {
    ref.current?.showModal();
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, scale: 0.95, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
      );
    }

    return () => {
      document.body.style.overflow = prev;
      lenis?.start();
      ScrollTrigger.refresh();
    };
  }, [lenis]);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      className={wide ? 'modal wide' : 'modal'}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <button className="close icon-button" aria-label="Close dialog" onClick={onClose}>
        <X size={19} />
      </button>
      {children}
    </dialog>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const isAnimating = useRef(false);

  const toggle = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const details = detailsRef.current;
    const content = contentRef.current;
    if (!details || !content || isAnimating.current) return;

    isAnimating.current = true;
    if (details.open) {
      gsap.to(content, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          details.removeAttribute('open');
          isAnimating.current = false;
          ScrollTrigger.refresh();
        },
      });
    } else {
      details.setAttribute('open', '');
      const targetHeight = content.scrollHeight;
      gsap.fromTo(
        content,
        { height: 0, opacity: 0 },
        {
          height: targetHeight,
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => {
            content.style.height = 'auto';
            isAnimating.current = false;
            ScrollTrigger.refresh();
          },
        }
      );
    }
  };

  return (
    <details ref={detailsRef}>
      <summary onClick={toggle}>
        {q}
        <Plus size={16} />
      </summary>
      <p ref={contentRef} style={{ overflow: 'hidden' }}>
        {a}
      </p>
    </details>
  );
}

export default function Storefront() {
  const mainRef = useRef<HTMLDivElement>(null);
  const { scrollTo } = useLenis();
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState('');
  const [category, setCategory] = useState('All work');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Featured');
  const [selected, setSelected] = useState<Product | null>(null);
  const [studio, setStudio] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  async function load() {
    try {
      const b = await api('');
      setProducts(b.products);
      setWallet(b.wallet);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial storefront data must load after client hydration.
    load();
    setStudio(location.hash === '#studio');
  }, []);

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);

  const all = [...products, ...samples];
  const filtered = all
    .filter(
      (p) =>
        (category === 'All work' || (category === 'Free' ? p.price === 0 : p.category === category)) &&
        `${p.title} ${p.description}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === 'Price: low to high'
        ? a.price - b.price
        : sort === 'Price: high to low'
        ? b.price - a.price
        : sort === 'Name'
        ? a.title.localeCompare(b.title)
        : 0
    );

  function openStudio() {
    setStudio(true);
    history.replaceState(null, '', '#studio');
  }

  // GSAP animations initialized via useGSAP
  useGSAP(
    () => {
      // Header slide down
      gsap.from('.header', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      // Hero initial load sequence
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero .eyebrow', {
        opacity: 0,
        y: -12,
        duration: 0.7,
      })
        .from(
          '.hero-line',
          {
            y: 45,
            opacity: 0,
            stagger: 0.12,
            duration: 0.9,
          },
          '-=0.4'
        )
        .from(
          '.hero p',
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          '-=0.5'
        )
        .from(
          '.hero .primary',
          {
            y: 20,
            opacity: 0,
            scale: 0.96,
            duration: 0.65,
          },
          '-=0.5'
        )
        .from(
          ['.hero-bottom', '.hero-side'],
          {
            opacity: 0,
            duration: 0.9,
            stagger: 0.1,
          },
          '-=0.4'
        );

      // Hero image parallax with ScrollTrigger
      gsap.to('.hero-image', {
        yPercent: 16,
        scale: 1.05,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Hero content fade and drift
      gsap.to('.hero-content', {
        yPercent: 20,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Ticker reveal
      gsap.from('.ticker > span', {
        y: 18,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.ticker',
          start: 'top 92%',
        },
      });

      // Collection section header
      gsap.from('.section-top', {
        y: 35,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.collection',
          start: 'top 85%',
        },
      });

      gsap.from('.filter-bar', {
        y: 20,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.filter-bar',
          start: 'top 90%',
        },
      });

      // About section reveal
      gsap.from('.about > div:first-child', {
        x: -35,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.about',
          start: 'top 80%',
        },
      });

      gsap.from('.about > div:last-child', {
        x: 35,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.about',
          start: 'top 80%',
        },
      });

      // FAQ section
      gsap.from('.faq > div:first-child', {
        y: 30,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.faq',
          start: 'top 80%',
        },
      });

      // Footer reveal
      gsap.from('footer', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: 'footer',
          start: 'top 95%',
        },
      });
    },
    { scope: mainRef }
  );

  // Stagger reveal on cards whenever filter criteria change
  useGSAP(
    () => {
      if (filtered.length > 0) {
        gsap.fromTo(
          '.product-card',
          { opacity: 0, y: 28, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.04,
            ease: 'power2.out',
            overwrite: 'auto',
          }
        );
      }
    },
    { scope: mainRef, dependencies: [category, search, sort, products.length] }
  );

  return (
    <div ref={mainRef}>
      <header className="header">
        <a
          href="#"
          className="brand"
          aria-label="Void Frame home"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
        >
          <img src="/logo.svg" alt="" />
          <span>
            void frame<span className="brand-dot">®</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a
            className="active"
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#collection');
            }}
          >
            Explore
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#about');
            }}
          >
            The studio
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              e.preventDefault();
              scrollTo('#faq');
            }}
          >
            FAQ
          </a>
        </nav>
        <button className="studio-button" onClick={openStudio}>
          Creator studio <ArrowUpRight size={14} />
        </button>
      </header>

      <main>
        <section className="hero">
          <img
            className="hero-image"
            src="/hero.png"
            alt="A silver portal reflected in a dark, mist-covered mountain lake"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow">
              <span className="live-dot" /> INDEPENDENT DIGITAL GOODS
            </div>
            <h1>
              <span className="hero-line block">Work beyond</span>
              <span className="hero-line block">
                the ordinary<span className="period">.</span>
              </span>
            </h1>
            <p>
              Distinctive websites, motion, and visual experiences.
              <br className="desktop" /> Crafted with intention. Ready for your next idea.
            </p>
            <a
              className="primary"
              href="#collection"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#collection');
              }}
            >
              Explore the collection <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-bottom">
            <span>DESIGNED TO STAND APART.</span>
            <span>
              01 — ENTER THE VOID <ArrowUpRight size={13} />
            </span>
          </div>
          <div className="hero-side">A DIFFERENT FRAME OF MIND</div>
        </section>

        <div className="ticker">
          <span>
            <i /> Curated by an independent creator
          </span>
          <span>
            Websites <b>·</b> Motion <b>·</b> Digital art
          </span>
          <span>
            <span className="coin">$</span> USDC / Arbitrum <ArrowUpRight size={13} />
          </span>
        </div>

        <section id="collection" className="collection">
          <div className="section-top">
            <div>
              <div className="eyebrow muted">THE COLLECTION / 001</div>
              <h2>
                Made to make an impression<span>.</span>
              </h2>
            </div>
            <p>Find something that feels different.</p>
          </div>

          <div className="filter-bar">
            <div className="categories" aria-label="Product categories">
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? 'chosen' : ''}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="search-sort">
              <label className="search">
                <Search size={15} />
                <input
                  aria-label="Search work"
                  placeholder="Search work..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} aria-label="Clear search">
                    <X size={13} />
                  </button>
                )}
              </label>
              <label className="sort">
                <SlidersHorizontal size={14} />
                <select
                  aria-label="Sort products"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {['Featured', 'Price: low to high', 'Price: high to low', 'Name'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="notice">
              {error} Sample collection is still available. <button onClick={load}>Retry</button>
            </div>
          )}

          <div className="results-label">
            <span>{filtered.length.toString().padStart(2, '0')} ITEMS</span>
            <span>SAMPLE LISTINGS INCLUDED</span>
          </div>

          <div className="product-grid">
            {filtered.map((p) => (
              <button className="product-card" key={p.id} onClick={() => setSelected(p)}>
                <div className="preview">
                  <Art p={p} />
                  <span className="sample-badge">
                    {p.sample ? 'SAMPLE' : p.media_type === 'video' ? 'VIDEO' : 'NEW'}
                  </span>
                  <span className="preview-button">
                    {p.media_type === 'video' ? <Play size={16} /> : <ArrowUpRight size={17} />}
                  </span>
                </div>
                <div className="product-info">
                  <div>
                    <h3>{p.title}</h3>
                    <span>{p.category}</span>
                  </div>
                  <span className={`price ${p.price === 0 ? 'free' : ''}`}>
                    {money(p.price)}
                    {p.price > 0 && <ArrowUpRight size={12} />}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {!filtered.length && (
            <div className="empty">
              <Search size={30} />
              <h3>No work found.</h3>
              <p>Try another search or explore a different category.</p>
              <button
                className="secondary"
                onClick={() => {
                  setSearch('');
                  setCategory('All work');
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          <div className="collection-end">
            <span>Thoughtfully made. Individually selected.</span>
            <span>
              END OF COLLECTION <span>↗</span>
            </span>
          </div>
        </section>

        <section id="about" className="about">
          <div>
            <span className="eyebrow muted">BEHIND THE FRAME</span>
            <h2>
              A small studio.
              <br />
              An expansive point of view.
            </h2>
          </div>
          <div>
            <p>
              Void Frame is a space for work with a little more character. An independent
              collection of websites, motion studies, and visual experiments—made for people who care
              about the details.
            </p>
            <a
              href="#collection"
              className="text-link"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#collection');
              }}
            >
              Find your next starting point <ArrowUpRight size={16} />
            </a>
          </div>
        </section>

        <section id="faq" className="faq">
          <div>
            <span className="eyebrow muted">A FEW THINGS TO KNOW</span>
            <h2>Before you dive in.</h2>
          </div>
          <div>
            {[
              [
                'What do I receive?',
                'Each listing has a preview and a description of the downloadable work. Sample listings are demonstrations; only the free Field Notes sample includes a sample download.',
              ],
              [
                'How do crypto payments work?',
                'Payments use USDC on Arbitrum. Once the creator adds a wallet, you can open an order and submit your transaction hash. The creator checks the transfer before unlocking the download. Keep your order link to return to it.',
              ],
              [
                'Can I download free work?',
                'Yes. Items labeled Free can be downloaded directly, with no wallet or payment required.',
              ],
              [
                'What license comes with my purchase?',
                'Check the product description for the creator’s usage terms before purchasing. No resale or commercial rights are implied unless stated in that listing.',
              ],
            ].map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>
      </main>

      <footer>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
          }}
        >
          <img src="/logo.svg" alt="" />
          <span>void frame</span>
        </a>
        <span>© {new Date().getFullYear()} Void Frame</span>
        <a
          href="#collection"
          onClick={(e) => {
            e.preventDefault();
            scrollTo('#collection');
          }}
        >
          Back to the collection <ArrowUpRight size={14} />
        </a>
      </footer>

      {selected && (
        <ProductModal
          p={selected}
          wallet={wallet}
          close={() => setSelected(null)}
          toast={setToast}
        />
      )}
      {studio && (
        <Studio
          close={() => {
            setStudio(false);
            history.replaceState(null, '', location.pathname);
          }}
          products={products}
          wallet={wallet}
          refresh={load}
          toast={setToast}
        />
      )}
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">
        <Check size={16} />
        {toast}
      </div>
    </div>
  );
}

function ProductModal({
  p,
  wallet,
  close,
  toast,
}: {
  p: Product;
  wallet: string;
  close: () => void;
  toast: (s: string) => void;
}) {
  const [order, setOrder] = useState<any>(null);
  const [tx, setTx] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vf-order-' + p.id) || 'null');
      if (saved)
        api(`order&id=${saved.id}&token=${saved.token}`)
          .then(setOrder)
          .catch(() => {});
    } catch {}
  }, [p.id]);

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const b = await api('checkout', { id: p.id });
      setOrder(b);
      localStorage.setItem('vf-order-' + p.id, JSON.stringify(b));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api('receipt', { id: order.id, token: order.token, tx });
      setOrder({ ...order, status: 'pending-review' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    try {
      setOrder(await api(`order&id=${order.id}&token=${order.token}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={close} title={p.title} wide>
      <div className="detail-art">
        <Art p={p} large />
      </div>
      <div className="detail-body">
        <div className="eyebrow muted">
          {p.category} {p.sample ? ' / SAMPLE LISTING' : ''}
        </div>
        <h2>{p.title}</h2>
        <p>{p.description}</p>
        <div className="purchase-row">
          <strong>{money(p.price)}</strong>
          <span>{p.price ? 'USDC ON ARBITRUM' : 'NO PAYMENT REQUIRED'}</span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {p.price === 0 ? (
          <a
            className="primary full"
            href={p.sample ? '/sample-notes.txt' : `/api/store.php?action=download&id=${p.id}`}
            download
          >
            Download {p.sample ? 'sample notes' : 'free file'} <Download size={17} />
          </a>
        ) : p.sample ? (
          <div className="notice">This is a sample product. It isn’t available for purchase.</div>
        ) : !order ? (
          <>
            <button className="primary full" disabled={!wallet || busy} onClick={checkout}>
              {busy ? 'Creating order…' : wallet ? 'Continue with USDC' : 'Payments opening soon'}
              <Wallet size={17} />
            </button>
            {!wallet && (
              <p className="small">The creator hasn’t added their payment wallet yet.</p>
            )}
          </>
        ) : (
          <div className="checkout">
            <div className="eyebrow">ORDER / {order.id.slice(0, 8)}</div>
            {order.status === 'awaiting-payment' ? (
              <>
                <h3>Send {money(order.price)}</h3>
                <p>
                  Use native USDC on <b>Arbitrum One</b>. Send the exact amount to this address, then
                  submit your transaction hash.
                </p>
                <div className="address">
                  {order.wallet}
                  <button
                    className="icon-button"
                    aria-label="Copy wallet address"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(order.wallet)
                        .then(() => toast('Wallet address copied'))
                        .catch(() => setError('Copy the wallet address manually.'))
                    }
                  >
                    <Copy size={15} />
                  </button>
                </div>
                <label>
                  Transaction hash
                  <input
                    value={tx}
                    onChange={(e) => setTx(e.target.value)}
                    placeholder="0x…"
                  />
                </label>
                <button
                  className="primary full"
                  disabled={busy || !tx}
                  onClick={submit}
                >
                  Submit for payment review <ArrowRight size={16} />
                </button>
                <p className="small">
                  Downloads unlock after the creator verifies your transfer. Keep this browser or
                  save your private order link.
                </p>
              </>
            ) : order.status === 'approved' ? (
              <>
                <h3>Payment approved</h3>
                <a
                  className="primary full"
                  href={`/api/store.php?action=download&id=${p.id}&token=${order.token}`}
                >
                  Download your file <Download size={17} />
                </a>
              </>
            ) : order.status === 'rejected' ? (
              <div className="notice">
                The creator could not verify this payment. Contact the creator with your order ID
                before sending another payment.
              </div>
            ) : (
              <>
                <h3>Payment submitted</h3>
                <p>
                  Your transfer is waiting for the creator’s review. Your file will appear here once
                  approved.
                </p>
                <button className="secondary" onClick={check} disabled={busy}>
                  Check payment status
                </button>
              </>
            )}
            <button
              className="text-link"
              onClick={() =>
                navigator.clipboard
                  .writeText(`${location.origin}/order?id=${order.id}&token=${order.token}`)
                  .then(() => toast('Private order link copied'))
                  .catch(() => setError('Clipboard unavailable. Your order is saved in this browser.'))
              }
            >
              Copy private order link <Copy size={14} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Studio({
  close,
  products,
  wallet,
  refresh,
  toast,
}: {
  close: () => void;
  products: Product[];
  wallet: string;
  refresh: () => Promise<void>;
  toast: (s: string) => void;
}) {
  const [auth, setAuth] = useState<any>(null);
  const [view, setView] = useState('Products');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState(wallet);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState(false);
  const [password, setPassword] = useState('');

  async function check() {
    try {
      setAuth(await api('studio'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Owner session state is fetched when the studio opens.
    check();
  }, []);

  async function action(name: string, data: unknown) {
    setBusy(true);
    setError('');
    try {
      await api(name, data);
      if (name === 'login' || name === 'logout') await check();
      if (name === 'wallet') toast('Wallet settings saved');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    try {
      setOrders(await api('orders'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal onClose={close} title="Creator studio" wide>
      <div className="studio-head">
        <span className="eyebrow muted">VOID FRAME / CREATOR SPACE</span>
        <h2>Your work. Your space.</h2>
        <p>Manage your collection and make something worth discovering.</p>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!auth ? (
        <div className="empty">
          {error ? 'Studio unavailable.' : 'Opening your studio…'}
          <button onClick={check} className="text-link">
            Retry
          </button>
        </div>
      ) : !auth.admin ? (
        <form
          className="setup"
          onSubmit={(e) => {
            e.preventDefault();
            action('login', { password });
          }}
        >
          <h3>Owner access</h3>
          <p>
            Enter the creator password to manage products, payment settings, and delivery
            approvals.
          </p>
          <label>
            Creator password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="primary" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Open creator studio'} <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <>
          <div className="studio-tabs">
            {['Products', 'Payments', 'Settings'].map((v) => (
              <button
                className={view === v ? 'chosen' : ''}
                key={v}
                onClick={() => {
                  setView(v);
                  setForm(false);
                  if (v === 'Payments') loadOrders();
                }}
              >
                {v === 'Products' ? (
                  <Grid2X2 size={15} />
                ) : v === 'Payments' ? (
                  <Wallet size={15} />
                ) : (
                  <Settings size={15} />
                )}{' '}
                {v}
              </button>
            ))}
            <button onClick={() => action('logout', {})}>Sign out</button>
          </div>
          <div className="studio-content">
            {view === 'Products' ? (
              form ? (
                <ProductForm
                  close={() => setForm(false)}
                  saved={async () => {
                    await refresh();
                    setForm(false);
                    toast('Product added to your collection');
                  }}
                />
              ) : (
                <>
                  <div className="studio-toolbar">
                    <span>{products.length} published products</span>
                    <button className="primary" onClick={() => setForm(true)}>
                      <Plus size={16} /> Add product
                    </button>
                  </div>
                  {products.length ? (
                    products.map((p) => (
                      <div key={p.id} className="studio-row">
                        <div>
                          <strong>{p.title}</strong>
                          <span>
                            {p.category} · {money(p.price)}
                          </span>
                        </div>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => action('archive', { id: p.id })}
                        >
                          Archive
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty">
                      <Package size={34} />
                      <h3>Your collection starts here.</h3>
                      <p>
                        Upload a preview, attach your file, and choose a price.
                        <br />
                        Sample listings are separate from your products.
                      </p>
                      <button className="text-link" onClick={() => setForm(true)}>
                        Add your first product <Plus size={15} />
                      </button>
                    </div>
                  )}
                </>
              )
            ) : view === 'Settings' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action('wallet', { wallet: address.trim() });
                }}
              >
                <h3>Payment destination</h3>
                <p>
                  Receive native USDC on Arbitrum One. Leave the address empty to keep checkout
                  closed.
                </p>
                <label>
                  Arbitrum wallet address
                  <input
                    placeholder="0x…"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    pattern="0x[a-fA-F0-9]{40}"
                  />
                </label>
                <div className="notice">
                  Native USDC token: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831. Only enter your
                  public receiving address. Never enter a seed phrase or private key. Transfers
                  require your review before downloads unlock.
                </div>
                <button className="primary" disabled={busy}>
                  Save payment settings <Check size={16} />
                </button>
              </form>
            ) : (
              <>
                <div className="studio-toolbar">
                  <span>Payment review</span>
                  <button className="secondary" onClick={loadOrders}>
                    Refresh
                  </button>
                </div>
                <p className="small">
                  Before approving, check the transaction succeeded on Arbitrum, contains native
                  USDC, and matches the order amount and receiving address. Approval unlocks the
                  file.
                </p>
                {!orders.length ? (
                  <div className="empty">
                    <Wallet size={30} />
                    <h3>No payments to review.</h3>
                    <p>Submitted transactions will appear here.</p>
                  </div>
                ) : (
                  orders.map((o) => (
                    <div className="order-row" key={o.id}>
                      <strong>
                        {o.title} · {money(o.price)}
                      </strong>
                      <span className="small">
                        Order {o.id.slice(0, 8)} · {o.status}
                      </span>
                      <span className="small" style={{ overflowWrap: 'anywhere' }}>
                        Receiving wallet: {o.wallet}
                      </span>
                      <a
                        href={`https://arbiscan.io/tx/${o.tx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Inspect transaction <ExternalLink size={14} />
                      </a>
                      {o.status === 'pending-review' && (
                        <div className="row-actions">
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={async () => {
                              await action('review', { id: o.id, status: 'rejected' });
                              loadOrders();
                            }}
                          >
                            Reject
                          </button>
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={async () => {
                              await action('review', { id: o.id, status: 'approved' });
                              loadOrders();
                            }}
                          >
                            Approve & unlock
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

function ProductForm({ close, saved }: { close: () => void; saved: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Websites');
  const [price, setPrice] = useState('');
  const [free, setFree] = useState(false);
  const [preview, setPreview] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function upload(f: File, kind: string) {
    const data = new FormData();
    data.append('file', f);
    data.append('kind', kind);
    const r = await fetch('/api/store.php?action=upload', { method: 'POST', body: data });
    const b: any = await r.json();
    if (!r.ok) throw new Error(b.error);
    return b;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!preview || !file) {
      setError('Choose a preview and a downloadable file.');
      return;
    }
    if (preview.size > 50 * 1024 * 1024 || file.size > 50 * 1024 * 1024) {
      setError('Each file must be 50 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      setStatus('Uploading preview…');
      const a = await upload(preview, 'preview');
      setStatus('Uploading product file…');
      const b = await upload(file, 'download');
      setStatus('Saving product…');
      await api('save', {
        title,
        description,
        category,
        price: free ? 0 : Math.round(Number(price) * 100),
        preview: a.key,
        preview_content_type: a.type,
        file: b.key,
        filename: b.name,
        media_type: preview.type.startsWith('video/') ? 'video' : 'image',
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <button type="button" className="text-link" onClick={close} disabled={busy}>
        ← Back to products
      </button>
      <h3>Add a new piece of work</h3>
      <div className="form-grid">
        <label>
          Product name
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your work a name"
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.slice(1, 5).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Description & usage terms
        <textarea
          required
          maxLength={5000}
          rows={4}
          placeholder="What’s included? How can buyers use your work?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label className="upload">
          <Upload size={22} />
          <strong>{preview ? preview.name : 'Upload a preview'}</strong>
          <span>Image or video · up to 50 MB</span>
          <input
            aria-label="Preview image or video"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
            onChange={(e) => setPreview(e.target.files?.[0] || null)}
          />
        </label>
        <label className="upload">
          <Package size={22} />
          <strong>{file ? file.name : 'Attach downloadable file'}</strong>
          <span>Your original work · up to 50 MB</span>
          <input
            aria-label="Downloadable product file"
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Price in USDC
          <input
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required={!free}
            disabled={free}
            placeholder="29.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={free}
            onChange={(e) => setFree(e.target.checked)}
          />{' '}
          Offer this work for free
        </label>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button className="primary full" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="spin" size={16} />
            {status}
          </>
        ) : (
          <>
            Add to collection <ArrowUpRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
