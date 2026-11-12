import Icon, { Logo } from './Icons.jsx'

// Desktop monitor frame with a stand. Children render on the screen.
export function Monitor({ children, className = '' }) {
  return (
    <div className={`monitor ${className}`}>
      <div className="monitor-screen">{children}</div>
      <div className="monitor-neck" />
      <div className="monitor-base" />
    </div>
  )
}

function AppSidebar() {
  const items = ['cart', 'box', 'chart', 'users', 'settings']
  return (
    <aside className="app-rail">
      <Logo size={22} />
      {items.map((i) => (
        <span key={i} className={i === 'cart' ? 'on' : ''}><Icon name={i} size={14} /></span>
      ))}
    </aside>
  )
}

// Billing screen: cart lines + totals + pay button.
export function PosBillingScreen({ status }) {
  const lines = [
    { name: 'Denim Jacket', meta: 'Size M · Blue', qty: 1, total: '3,450' },
    { name: 'Cotton Shirt', meta: 'Size L · White', qty: 2, total: '2,980' },
    { name: 'Leather Shoes', meta: 'Size 42 · Brown', qty: 1, total: '5,990' },
    { name: 'Sports Cap', meta: 'One size', qty: 1, total: '890' },
    { name: 'Summer Kurta', meta: 'Size M · Green', qty: 1, total: '2,250' },
  ]
  return (
    <div className="app">
      <AppSidebar />
      <div className="app-body">
        <div className="app-top">
          <div className="app-title">Active Bill <em>#1042</em></div>
          {status}
        </div>
        <div className="bill">
          <div className="bill-lines" style={{ display: 'flex', flexDirection: 'column' }}>
            {lines.map((l) => (
              <div className="bill-line" key={l.name}>
                <span className="bill-thumb" />
                <div><b>{l.name}</b><small>{l.meta}</small></div>
                <span className="bill-qty">×{l.qty}</span>
                <b className="bill-amt">Rs. {l.total}</b>
              </div>
            ))}
            <div className="bill-cust"><span>Customer: <b>Walk-in</b></span><span>5 items · 6 pcs</span></div>
          </div>
          <div className="bill-side">
            <div className="bill-row"><span>Subtotal</span><span>Rs. 15,560</span></div>
            <div className="bill-row"><span>Discount</span><span>− Rs. 500</span></div>
            <div className="bill-row"><span>Tax</span><span>Rs. 0</span></div>
            <div className="bill-total"><span>Total</span><b>Rs. 15,060</b></div>
            <div className="bill-pay">
              <span>Cash</span><span className="on">Card</span><span>Split</span>
            </div>
            <div className="bill-btn"><Icon name="receipt" size={13} /> Pay & Print</div>
          </div>
        </div>
      </div>
    </div>
  )
}
