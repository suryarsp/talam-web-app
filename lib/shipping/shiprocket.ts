import {
  assignShiprocketAwb,
  createShiprocketOrder,
  shiprocketLogin,
  type ShiprocketOrderInput,
  type ShiprocketShipment,
} from './shiprocket-client'
import {
  getDecryptedShiprocketCredential,
  getShippingConfig,
  markShiprocketCredentialStale,
} from './shiprocket-account'

/**
 * Creates a shipment in *the tenant's own* Shiprocket account.
 *
 * Model A: every shop holds its own Shiprocket account, so its own KYC, bank account, COD
 * remittance and RTO liability. Talam never ships under a shared platform account — see
 * docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md for the PoC this
 * replaced.
 */

export type { ShiprocketOrderInput, ShiprocketShipment } from './shiprocket-client'

export async function createShiprocketShipment(
  tenantId: string,
  input: ShiprocketOrderInput
): Promise<ShiprocketShipment> {
  const credential = await getDecryptedShiprocketCredential(tenantId)
  if (!credential) throw new Error('No Shiprocket account is connected for this store.')

  const config = await getShippingConfig(tenantId)
  if (!config.pickupLocation) {
    throw new Error('No Shiprocket pickup location is configured for this store.')
  }

  let token: string
  try {
    token = await shiprocketLogin(credential.email, credential.password)
  } catch (err) {
    // Almost always means the shop rotated their Shiprocket password. Nothing else notices
    // until a shipment is attempted, so record it here: Settings then shows a reconnect
    // prompt and shipViaShiprocketAction blocks further attempts with a useful message.
    await markShiprocketCredentialStale(tenantId, err instanceof Error ? err.message : 'Login failed')
    throw new Error(
      'Your Shiprocket account could not be authenticated — reconnect it in Settings → Shipping.'
    )
  }

  const { shipmentId } = await createShiprocketOrder(token, config.pickupLocation, input)
  const { awbCode, courierName } = await assignShiprocketAwb(token, shipmentId)

  return { awbCode, courierName, shipmentId }
}
