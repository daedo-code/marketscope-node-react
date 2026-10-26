import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'http://localhost:3001/api';
const request = (path, options) => fetch(`${API}${path}`, options).then(async response => {
  if (!response.ok) throw new Error('Error de conexión');
  if (response.status === 204) return null;
  return response.json();
});
const formatMoney = (value, currency = 'USD') => value ? new Intl.NumberFormat('es-ES', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value) : 'Sin dato';
const salesUnitFactor = { USD: 1, 'Miles de USD': 1000, 'Millones de USD': 1000000 };
const formatSales = (value, unit = 'Millones de USD') => {
  if (!value) return 'Sin dato';
  const selectedUnit = salesUnitFactor[unit] ? unit : 'Millones de USD';
  const labels = { USD: '', 'Miles de USD': ' mil', 'Millones de USD': ' M' };
  return `US$${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(Number(value) / salesUnitFactor[selectedUnit])}${labels[selectedUnit]}`;
};
const formatNumber = value => value ? new Intl.NumberFormat('es-ES').format(value) : 'Sin dato';
const companySize = employees => !employees ? 'Sin dato' : employees < 10 ? 'Microempresa' : employees < 50 ? 'Pequeña empresa' : employees < 250 ? 'Mediana empresa' : employees < 1000 ? 'Gran empresa' : employees < 10000 ? 'Corporación' : employees < 50000 ? 'Gran corporación' : 'Corporación global';
const companyIdFromUrl = () => Number(window.location.hash.match(/^#\/companies\/(\d+)$/)?.[1]) || null;

function Modal({ title, children, onClose }) {
  return <div className="overlay"><section className="modal"><button className="close" onClick={onClose}>×</button><h2>{title}</h2>{children}</section></div>;
}
function Field({ label, ...props }) { return <label>{label}<input {...props} required={props.required !== false} /></label>; }

function App() {
  const initialId = companyIdFromUrl();
  const [view, setView] = useState(initialId ? 'Detalle de empresa' : 'Resumen');
  const [companyId, setCompanyId] = useState(initialId);
  const [collectionId, setCollectionId] = useState(null);
  const [data, setData] = useState({ companies: [], markets: [], opportunities: [], collections: [], dashboard: null });
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [companies, markets, opportunities, collections, dashboard] = await Promise.all(['companies', 'markets', 'opportunities', 'collections', 'dashboard'].map(item => request(`/${item}`)));
      setData({ companies, markets, opportunities, collections, dashboard }); setError('');
    } catch { setError('No fue posible conectar con la API. Confirma que Docker y el servidor estén activos.'); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const syncRoute = () => { const id = companyIdFromUrl(); setCompanyId(id); setView(id ? 'Detalle de empresa' : 'Resumen'); };
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  const submit = async (event, type) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.target));
    if (type === 'companies') {
      values.annual_sales_usd = values.annual_sales_amount ? Number(values.annual_sales_amount) * salesUnitFactor[values.sales_unit] : '';
      delete values.annual_sales_amount;
    }
    try { await request(`/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); setModal(null); load(); }
    catch { setError('No se pudo guardar el registro.'); }
  };
  const selectView = (nextView) => { history.pushState('', '', `${location.pathname}${location.search}`); setCompanyId(null); setCollectionId(null); setView(nextView); };
  const isDetail = view === 'Detalle de empresa' || view === 'Detalle de colección';
  const list = view === 'Empresas' ? data.companies : view === 'Mercados' ? data.markets : view === 'Colecciones' ? data.collections : data.opportunities;
  return <main>
    <aside><div className="brand"><span>◈</span> MarketScope</div><p>INTELIGENCIA DE NEGOCIO</p>
      {['Resumen', 'Empresas', 'Mercados', 'Colecciones', 'Oportunidades'].map(item => <button className={view === item ? 'active' : ''} onClick={() => selectView(item)} key={item}>{item}</button>)}
      <div className="aside-foot">v1.0 · Datos verificables</div>
    </aside>
    <section className="content"><header><div><span className="eyebrow">PLATAFORMA DE INTELIGENCIA</span><h1>{view === 'Detalle de empresa' ? 'Empresa' : view === 'Detalle de colección' ? 'Colección' : view}</h1></div>
      {!isDetail && view !== 'Resumen' && <button className="primary" onClick={() => setModal(view)}>+ Añadir {view.slice(0, -1)}</button>}
    </header>
    {error && <div className="error">{error}</div>}
    {view === 'Detalle de empresa' ? <CompanyDetail key={companyId} companyId={companyId} collections={data.collections} onBack={() => selectView('Empresas')} onChanged={load} /> : view === 'Detalle de colección' ? <CollectionDetail key={collectionId} collectionId={collectionId} onBack={() => selectView('Colecciones')} onChanged={load} onCompanySelect={id => { window.location.hash = `/companies/${id}`; }} /> : view === 'Resumen' ? <Dashboard data={data} /> : <Listing view={view} list={list} onCompanySelect={id => { window.location.hash = `/companies/${id}`; }} onCollectionSelect={id => { setCollectionId(id); setView('Detalle de colección'); }} />}
    </section>
    {modal && <CreateForm type={modal} markets={data.markets} onClose={() => setModal(null)} onSubmit={submit} />}
  </main>;
}

function Dashboard({ data }) {
  const d = data.dashboard;
  return <><div className="intro"><h2>Una vista clara de tu ecosistema</h2><p>Conecta empresas, mercados y necesidades para descubrir dónde crear valor.</p></div>
    <div className="stats"><Stat label="Empresas analizadas" value={d?.companies ?? '—'} icon="◉" /><Stat label="Mercados mapeados" value={d?.markets ?? '—'} icon="◫" /><Stat label="Oportunidades activas" value={d?.opportunities ?? '—'} icon="✦" /></div>
    <div className="grid"><article className="panel"><div className="panel-head"><h3>Participación destacada</h3><span>Datos estimados</span></div>{d?.topShares?.length ? d.topShares.map(item => <div className="bar" key={item.name}><div><b>{item.name}</b><strong>{item.share_percentage}%</strong></div><i><em style={{ width: `${item.share_percentage}%` }} /></i></div>) : <Empty text="Aún no hay participaciones registradas." />}</article>
      <article className="panel"><div className="panel-head"><h3>Oportunidades prioritarias</h3><span>Por atractivo</span></div>{data.opportunities.slice(0, 3).map(item => <div className="op-summary" key={item.id}><span>{item.attractiveness}/10</span><div><b>{item.title}</b><small>{item.target_segment}</small></div></div>)}{!data.opportunities.length && <Empty text="Crea tu primera hipótesis." />}</article>
    </div></>;
}
function Stat({ label, value, icon }) { return <article className="stat"><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></article>; }
function Empty({ text }) { return <p className="empty">{text}</p>; }
function CompanyLogo({ company, large = false }) {
  const [failed, setFailed] = useState(false);
  const initials = company.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
  const companyLogoUrls = {
    'Transbank / Webpay': 'https://www.google.com/s2/favicons?domain=transbank.cl&sz=128',
    'Mercado Libre': 'https://www.google.com/s2/favicons?domain=mercadolibre.com&sz=128',
    SONDA: 'https://www.google.com/s2/favicons?domain=sonda.com&sz=128',
    'Microsoft 365': 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=128',
    'Microsoft Azure': 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=128',
    'Amazon Web Services (AWS)': 'https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=128',
    'Google Ads': 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    'Google Cloud / Workspace': 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    SAP: 'https://www.google.com/s2/favicons?domain=sap.com&sz=128',
    Oracle: 'https://www.google.com/s2/favicons?domain=oracle.com&sz=128',
    Salesforce: 'https://www.google.com/s2/favicons?domain=salesforce.com&sz=128',
    Adobe: 'https://www.google.com/s2/favicons?domain=adobe.com&sz=128',
    Uber: 'https://www.google.com/s2/favicons?domain=uber.com&sz=128',
    PedidosYa: 'https://www.google.com/s2/favicons?domain=pedidosya.com&sz=128',
    Rappi: 'https://www.google.com/s2/favicons?domain=rappi.com&sz=128',
    'Mercado Pago': 'https://www.google.com/s2/favicons?domain=mercadopago.com&sz=128',
    Getnet: 'https://www.google.com/s2/favicons?domain=getnet.com&sz=128',
    Buk: 'https://www.google.com/s2/favicons?domain=buk.cl&sz=128',
    Bsale: 'https://www.google.com/s2/favicons?domain=bsale.cl&sz=128',
    Defontana: 'https://www.google.com/s2/favicons?domain=defontana.com&sz=128',
    AgendaPro: 'https://www.google.com/s2/favicons?domain=agendapro.com&sz=128',
    Nubox: 'https://www.google.com/s2/favicons?domain=nubox.com&sz=128',
    Khipu: 'https://www.google.com/s2/favicons?domain=khipu.com&sz=128',
    Talana: 'https://www.google.com/s2/favicons?domain=talana.com&sz=128'
  };
  const knownBrands = {
    Netflix: <span className="netflix-mark">NETFLIX</span>,
    Spotify: <span className="spotify-mark"><i>≋</i>Spotify</span>,
    'Disney+': <span className="disney-mark">Disney<span>+</span></span>
  };
  if (knownBrands[company.name]) return <div className={`company-logo brand-${company.name.replace('+', 'plus').toLowerCase()} ${large ? 'large' : ''}`}>{knownBrands[company.name]}</div>;
  const logoUrl = company.logo_url || companyLogoUrls[company.name];
  if (!logoUrl || failed) return <div className={`company-logo ${large ? 'large' : ''}`}>{initials}</div>;
  return <div className={`company-logo ${large ? 'large' : ''}`}><img src={logoUrl} alt={`Logo de ${company.name}`} onError={() => setFailed(true)} /></div>;
}

function Listing({ view, list, onCompanySelect, onCollectionSelect }) {
  const [companyDisplay, setCompanyDisplay] = useState('cards');
  if (!list.length) return <div className="cards"><Empty text={`No hay ${view.toLowerCase()} todavía.`} /></div>;
  if (view === 'Empresas') return <>
    <div className="listing-toolbar">
      <span>{list.length} {list.length === 1 ? 'empresa' : 'empresas'}</span>
      <div className="view-switch" aria-label="Modo de visualización">
        <button className={companyDisplay === 'cards' ? 'active' : ''} onClick={() => setCompanyDisplay('cards')} aria-pressed={companyDisplay === 'cards'}>Tarjetas</button>
        <button className={companyDisplay === 'table' ? 'active' : ''} onClick={() => setCompanyDisplay('table')} aria-pressed={companyDisplay === 'table'}>Tabla</button>
      </div>
    </div>
    {companyDisplay === 'table' ? <div className="company-table-wrap"><table className="company-table"><thead><tr><th>#</th><th>Empresa</th><th>Sector</th><th>País</th><th>Empleados</th><th>Ventas anuales</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{list.map((item, index) => <tr key={item.id} onClick={() => onCompanySelect(item.id)}><td className="table-index">{index + 1}</td><td><div className="table-company"><CompanyLogo company={item} /><strong>{item.name}</strong></div></td><td>{item.sector || 'Sin dato'}</td><td>{item.country || 'Sin dato'}</td><td>{formatNumber(item.employee_count)}<small className="table-subtext">{companySize(item.employee_count)}</small></td><td>{formatSales(item.annual_sales_usd, item.sales_unit)}<small className="table-subtext">{item.sales_scope || 'Sin cobertura'}{item.sales_year && ` · ${item.sales_year}`}</small></td><td><button className="table-detail" onClick={event => { event.stopPropagation(); onCompanySelect(item.id); }}>Ver ficha <span aria-hidden="true">→</span></button></td></tr>)}</tbody></table></div> : <div className="cards">{list.map(item =>
      <button className="card card-button" onClick={() => onCompanySelect(item.id)} key={item.id}><div className="company-card-heading"><CompanyLogo company={item} /><div><span className="tag">{item.sector}</span><h2>{item.name}</h2></div></div><p>{item.description || 'Sin descripción.'}</p><footer>{item.country} · {item.business_model || 'Modelo sin definir'}</footer><span className="open-detail">Ver ficha →</span></button>
    )}</div>}
  </>;
  return <div className="cards">{list.map(item => view === 'Empresas' ?
    <button className="card card-button" onClick={() => onCompanySelect(item.id)} key={item.id}><div className="company-card-heading"><CompanyLogo company={item} /><div><span className="tag">{item.sector}</span><h2>{item.name}</h2></div></div><p>{item.description || 'Sin descripción.'}</p><footer>{item.country} · {item.business_model || 'Modelo sin definir'}</footer><span className="open-detail">Ver ficha →</span></button> :
    view === 'Mercados' ? <article className="card" key={item.id}><span className="tag">{item.geography} · {item.period_label}</span><h2>{item.name}</h2><p>{item.industry}</p><div className="metric">{formatMoney(item.market_size, item.currency)} <small>tamaño de mercado</small></div><footer>{item.participant_count} participantes · crecimiento {item.growth_rate ?? '—'}%</footer></article> :
    view === 'Colecciones' ? <button className="card card-button collection-card" style={{ '--collection-color': item.color }} onClick={() => onCollectionSelect(item.id)} key={item.id}><span className="collection-dot" /><span className="tag">COLECCIÓN</span><h2>{item.name}</h2><p>{item.description || 'Lista personalizada de empresas.'}</p><footer>{item.company_count} empresas · Abrir colección →</footer></button> :
    <article className="card opportunity" key={item.id}><div className="score">{item.attractiveness}<small>/10</small></div><span className="tag">{item.status}</span><h2>{item.title}</h2><p>{item.problem}</p><footer>{item.target_segment} {item.market_name && ` · ${item.market_name}`}</footer></article>)}</div>;
}

function CompanyDetail({ companyId, onBack, collections, onChanged }) {
  const [company, setCompany] = useState(null); const [failed, setFailed] = useState(false);
  const load = () => request(`/companies/${companyId}`).then(setCompany).catch(() => setFailed(true));
  useEffect(() => { load(); }, [companyId]);
  if (failed) return <><button className="back" onClick={onBack}>← Volver a empresas</button><Empty text="No se encontró la empresa solicitada." /></>;
  if (!company) return <p className="empty">Cargando ficha de empresa…</p>;
  return <><button className="back" onClick={onBack}>← Volver a empresas</button>
    <section className="company-hero"><div className="hero-company"><CompanyLogo company={company} large /><div><span className="tag">{company.sector}</span><h2>{company.name}</h2><p>{company.description || 'Esta empresa todavía no tiene una descripción.'}</p></div></div><dl><div><dt>País</dt><dd>{company.country}</dd></div><div><dt>Fundación</dt><dd>{company.founded_year || 'Sin dato'}</dd></div><div><dt>Empleados</dt><dd>{formatNumber(company.employee_count)} · {companySize(company.employee_count)}</dd></div><div><dt>Ventas anuales</dt><dd>{formatSales(company.annual_sales_usd, company.sales_unit)}{company.sales_scope && ` · ${company.sales_scope}`}{company.sales_year && ` (${company.sales_year})`}</dd></div><div><dt>Modelo</dt><dd>{company.business_model || 'Sin definir'}</dd></div></dl></section>
    <div className="detail-grid"><article className="panel"><h3>Propuesta de valor</h3><p className="detail-text">{company.value_proposition || 'Pendiente de documentar.'}</p><CompanyMetrics company={company} onSaved={() => { load(); onChanged(); }} /><CollectionAssignment companyId={companyId} collections={collections} onChanged={onChanged} /></article><article className="panel"><h3>Mercados y cuota</h3>{company.marketShares.length ? company.marketShares.map(share => <div className="share-row" key={share.market_id}><div><b>{share.market_name}</b><small>{share.geography} · {share.period_label} · confianza {share.confidence}</small></div><strong>{share.share_percentage}%</strong><p>{share.estimated_revenue ? `${formatMoney(share.estimated_revenue, share.currency)} · ` : ''}{share.source_name || 'Sin fuente registrada'}</p></div>) : <Empty text="No participa en mercados registrados todavía." />}</article></div>
  </>;
}

function CompanyMetrics({ company, onSaved }) {
  const [message, setMessage] = useState('');
  const save = async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.target));
    values.annual_sales_usd = values.annual_sales_amount ? Number(values.annual_sales_amount) * salesUnitFactor[values.sales_unit] : '';
    delete values.annual_sales_amount;
    try { await request(`/companies/${company.id}/metrics`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); setMessage('Métricas guardadas.'); onSaved(); }
    catch { setMessage('No se pudieron guardar las métricas.'); }
  };
  const salesUnit = company.sales_unit || 'Millones de USD';
  return <form className="company-metrics" onSubmit={save}><h3>Prioridad y métricas</h3><div><label>Empleados<input name="employee_count" type="number" min="1" defaultValue={company.employee_count || ''} /></label><label>Ventas anuales<input name="annual_sales_amount" type="number" min="0" step="0.01" defaultValue={company.annual_sales_usd ? Number(company.annual_sales_usd) / salesUnitFactor[salesUnit] : ''} /></label><label>Unidad<select name="sales_unit" defaultValue={salesUnit}><option>USD</option><option>Miles de USD</option><option>Millones de USD</option></select></label><label>Año<select name="sales_year" defaultValue={company.sales_year || ''}><option value="">Sin dato</option>{[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(year => <option key={year}>{year}</option>)}</select></label><label>Cobertura<select name="sales_scope" defaultValue={company.sales_scope || ''}><option value="">Sin especificar</option><option>Chile</option><option>Regional</option><option>Global</option><option>Estimado</option></select></label></div><button className="secondary" type="submit">Guardar métricas</button>{message && <small>{message}</small>}</form>;
}

function CollectionAssignment({ companyId, collections, onChanged }) {
  const [collectionId, setCollectionId] = useState(''); const [message, setMessage] = useState('');
  const add = async () => {
    if (!collectionId) return;
    try { await request(`/collections/${collectionId}/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId }) }); setMessage('Empresa añadida a la colección.'); setCollectionId(''); onChanged(); }
    catch { setMessage('No se pudo añadir la empresa.'); }
  };
  return <div className="assignment"><h3>Agregar a colección</h3>{collections.length ? <div><select value={collectionId} onChange={event => setCollectionId(event.target.value)}><option value="">Selecciona una colección</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select><button className="secondary" onClick={add}>Añadir</button></div> : <p>Primero crea una colección.</p>}{message && <small>{message}</small>}</div>;
}

function CollectionDetail({ collectionId, onBack, onChanged, onCompanySelect }) {
  const [collection, setCollection] = useState(null); const [failed, setFailed] = useState(false); const [sortBy, setSortBy] = useState('name'); const [display, setDisplay] = useState('table'); const [editing, setEditing] = useState(false);
  const load = () => request(`/collections/${collectionId}`).then(setCollection).catch(() => setFailed(true));
  useEffect(() => { load(); }, [collectionId]);
  const remove = async companyId => { await request(`/collections/${collectionId}/companies/${companyId}`, { method: 'DELETE' }); load(); onChanged(); };
  if (failed) return <><button className="back" onClick={onBack}>← Volver a colecciones</button><Empty text="No se encontró la colección." /></>;
  if (!collection) return <p className="empty">Cargando colección…</p>;
  const sortedCompanies = [...collection.companies].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'es');
    const field = sortBy === 'employees' ? 'employee_count' : 'annual_sales_usd';
    const aValue = Number(a[field]); const bValue = Number(b[field]);
    if (!aValue && !bValue) return a.name.localeCompare(b.name, 'es');
    if (!aValue) return 1; if (!bValue) return -1;
    return bValue - aValue;
  });
  return <>{editing && <CollectionEditor collection={collection} onClose={() => setEditing(false)} onSaved={async () => { await load(); onChanged(); }} />}<button className="back" onClick={onBack}>← Volver a colecciones</button><section className="collection-hero" style={{ '--collection-color': collection.color }}><span className="collection-dot" /><div><span className="tag">COLECCIÓN PERSONALIZADA</span><h2>{collection.name}</h2><p>{collection.description || 'Lista de empresas seleccionadas manualmente.'}</p><button className="secondary collection-edit" onClick={() => setEditing(true)}>Editar colección</button></div></section><div className="collection-companies"><div className="collection-companies-head"><h3>{collection.companies.length} empresas en esta colección</h3><div className="collection-view-controls">{collection.companies.length > 1 && <label>Ordenar por<select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="name">Nombre</option><option value="employees">Más empleados</option><option value="sales">Mayores ventas</option></select></label>}<div className="view-switch" aria-label="Modo de visualización"><button className={display === 'table' ? 'active' : ''} onClick={() => setDisplay('table')} aria-pressed={display === 'table'}>Tabla</button><button className={display === 'cards' ? 'active' : ''} onClick={() => setDisplay('cards')} aria-pressed={display === 'cards'}>Tarjetas</button></div></div></div>{collection.companies.length ? display === 'table' ? <div className="company-table-wrap"><table className="company-table"><thead><tr><th>#</th><th>Empresa</th><th>Sector</th><th>País</th><th>Empleados</th><th>Ventas anuales</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{sortedCompanies.map((company, index) => <tr key={company.id} onClick={() => onCompanySelect(company.id)}><td className="table-index">{index + 1}</td><td><div className="table-company"><CompanyLogo company={company} /><strong>{company.name}</strong></div></td><td>{company.sector || 'Sin dato'}</td><td>{company.country || 'Sin dato'}</td><td>{formatNumber(company.employee_count)}<small className="table-subtext">{companySize(company.employee_count)}</small></td><td>{formatSales(company.annual_sales_usd, company.sales_unit)}<small className="table-subtext">{company.sales_scope || 'Sin cobertura'}{company.sales_year && ` · ${company.sales_year}`}</small></td><td><button className="table-detail remove-from-collection" onClick={event => { event.stopPropagation(); remove(company.id); }}>Quitar</button></td></tr>)}</tbody></table></div> : <div className="cards collection-company-cards">{sortedCompanies.map(company => <article className="card collection-company-card" key={company.id}><button className="collection-card-open" onClick={() => onCompanySelect(company.id)}><div className="company-card-heading"><CompanyLogo company={company} /><div><span className="tag">{company.sector}</span><h2>{company.name}</h2></div></div><p>{company.description || 'Sin descripción.'}</p><footer>{formatNumber(company.employee_count)} empleados · {formatSales(company.annual_sales_usd, company.sales_unit)}</footer><span className="open-detail">Ver ficha →</span></button><button className="secondary remove-company" onClick={() => remove(company.id)}>Quitar</button></article>)}</div> : <Empty text="Añade empresas desde la ficha individual de cada empresa." />}</div></>;
}

function CollectionEditor({ collection, onClose, onSaved }) {
  const [error, setError] = useState('');
  const save = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    try {
      await request(`/collections/${collection.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      await onSaved();
      onClose();
    } catch { setError('No se pudo guardar la colección.'); }
  };
  return <Modal title="Editar colección" onClose={onClose}><form onSubmit={save}>
    <Field label="Nombre de la colección" name="name" defaultValue={collection.name} />
    <label>Descripción<textarea name="description" defaultValue={collection.description || ''} placeholder="Criterio o propósito de esta lista" /></label>
    <label>Color identificador<input name="color" type="color" defaultValue={collection.color || '#326d5b'} /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary" type="submit">Guardar cambios</button>
  </form></Modal>;
}

function CreateForm({ type, markets, onClose, onSubmit }) {
  const plural = type === 'Empresas' ? 'companies' : type === 'Mercados' ? 'markets' : type === 'Colecciones' ? 'collections' : 'opportunities';
  return <Modal title={`Nueva ${type.slice(0, -1)}`} onClose={onClose}><form onSubmit={event => onSubmit(event, plural)}>
    {type === 'Empresas' && <><Field label="Nombre" name="name" /><Field label="URL del logo" name="logo_url" type="url" placeholder="https://ejemplo.com/logo.png" required={false} /><Field label="Sector" name="sector" /><Field label="País" name="country" /><Field label="Año de fundación" name="founded_year" type="number" required={false} /><Field label="Número de empleados" name="employee_count" type="number" min="1" required={false} /><Field label="Ventas anuales" name="annual_sales_amount" type="number" min="0" step="0.01" required={false} /><label>Unidad<select name="sales_unit" defaultValue="Millones de USD"><option>USD</option><option>Miles de USD</option><option>Millones de USD</option></select></label><Field label="Año de ventas" name="sales_year" type="number" min="1900" required={false} /><label>Cobertura de ventas<select name="sales_scope"><option value="">Sin especificar</option><option>Chile</option><option>Regional</option><option>Global</option><option>Estimado</option></select></label><Field label="Modelo de negocio" name="business_model" required={false} /><label>Descripción<textarea name="description" /></label><label>Propuesta de valor<textarea name="value_proposition" /></label></>}
    {type === 'Mercados' && <><Field label="Nombre del mercado" name="name" /><Field label="Industria" name="industry" /><Field label="Geografía" name="geography" /><Field label="Periodo" name="period_label" placeholder="2025" /><Field label="Tamaño de mercado" name="market_size" type="number" required={false} /><Field label="Crecimiento anual (%)" name="growth_rate" type="number" step="0.01" required={false} /><label>Moneda<select name="currency"><option>USD</option><option>EUR</option><option>MXN</option></select></label></>}
    {type === 'Colecciones' && <><Field label="Nombre de la colección" name="name" placeholder="Empresas chilenas de software" /><label>Descripción<textarea name="description" placeholder="Criterio o propósito de esta lista" /></label><label>Color identificador<input name="color" type="color" defaultValue="#326d5b" /></label></>}
    {type === 'Oportunidades' && <><Field label="Título" name="title" /><label>Mercado relacionado<select name="market_id"><option value="">Sin asignar</option>{markets.map(market => <option value={market.id} key={market.id}>{market.name}</option>)}</select></label><label>Problema detectado<textarea name="problem" required /></label><Field label="Segmento objetivo" name="target_segment" /><label>Estado<select name="status"><option>Detectada</option><option>En investigación</option><option>Validada</option><option>Descartada</option></select></label><Field label="Atractivo (1–10)" name="attractiveness" type="number" min="1" max="10" defaultValue="5" /><label>Evidencia<textarea name="evidence" /></label></>}
    <button className="primary" type="submit">Guardar registro</button>
  </form></Modal>;
}
createRoot(document.getElementById('root')).render(<App />);
