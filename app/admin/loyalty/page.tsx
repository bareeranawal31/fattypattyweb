import { redirect } from 'next/navigation'

export default function AdminLoyaltyRedirectPage() {
  redirect('/admin/settings')
}
