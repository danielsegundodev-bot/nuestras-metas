import { useData } from '../data/store'
import type { Contribution } from '../lib/types'
import { errorMessage, useUi } from './ui'

/** Delete with an undo toast; shared by the transaction detail sheet. */
export function useRemoveContribution() {
  const { deleteContribution, addContribution } = useData()
  const { toast } = useUi()
  return async function remove(c: Contribution): Promise<boolean> {
    try {
      await deleteContribution(c.id)
      toast('Movimiento eliminado', {
        action: {
          label: 'Deshacer',
          run: () => {
            addContribution({
              goal_id: c.goal_id,
              amount: c.amount,
              currency: c.currency,
              fx_usd_mxn: c.fx_usd_mxn,
              date: c.date,
              note: c.note,
            }).catch((e) =>
              toast(errorMessage(e, 'No se pudo deshacer. Vuelve a agregarlo.'), { tone: 'error' }),
            )
          },
        },
      })
      return true
    } catch (e) {
      toast(errorMessage(e, 'No se pudo eliminar. Intenta de nuevo.'), { tone: 'error' })
      return false
    }
  }
}
