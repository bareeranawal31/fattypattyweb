import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerName,
      email,
      orderId,
      items,
      total,
      orderType,
      estimatedTime,
      area,
      branch,
      storeName,
      storePhone,
      storeEmail,
    } = body

    const safeStoreName = storeName || 'Fatty Patty'
    const safeStorePhone = storePhone || '+92 300 123 4567'
    const safeStoreEmail = storeEmail || 'orders@fattypatty.pk'

    // Build the email body
    const itemsList = items.map(
      (item: { name: string; quantity: number; price: number }) =>
        `${item.quantity}x ${item.name} - Rs. ${item.price.toLocaleString()}`
    ).join('\n')

    const emailBody = `
Dear ${customerName},

Thank you for your order at ${safeStoreName}!

Order Confirmation
------------------
Order Number: ${orderId}
Order Type: ${orderType === 'delivery' ? 'Delivery' : 'Pickup'}
${orderType === 'delivery' ? `Delivery Area: ${area}` : `Pickup Branch: ${branch}`}
Estimated Time: ${estimatedTime}

Items Ordered:
${itemsList}

Total: Rs. ${total.toLocaleString()}

${ orderType === 'delivery'
    ? 'Your order will be delivered to your doorstep. Our rider will contact you when nearby.'
    : 'Your order will be ready for pickup. We will notify you when it is prepared.'
}

Thank you for choosing ${safeStoreName}!
Original Taste Since 2020.

---
This is an automated confirmation. For questions, call us at ${safeStorePhone} or email ${safeStoreEmail}.
    `.trim()

    // In production, integrate with a real email service (Resend, SendGrid, etc.)
    // For now we log the email and return success
    console.log('[v0] Order confirmation email:', { to: email, subject: `${safeStoreName} Confirmation - ${orderId}`, body: emailBody })

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      orderId,
    })
  } catch (error) {
    console.error('[v0] Email sending error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send confirmation email' },
      { status: 500 }
    )
  }
}
