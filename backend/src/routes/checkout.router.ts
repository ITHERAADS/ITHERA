import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import * as CheckoutService from '../domain/checkout/checkout.service';
import { SimulatedCheckoutPayload } from '../domain/checkout/checkout.entity';

const router = Router();

const getStatusCode = (err: unknown): number => {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  return typeof statusCode === 'number' ? statusCode : 500;
};

router.post('/flight/:proposalId/pay', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId invalido' });
      return;
    }

    const result = await CheckoutService.simulateFlightPurchase(
      req.user!.id,
      proposalId,
      req.body as SimulatedCheckoutPayload,
    );

    res.status(200).json({
      ok: true,
      message: 'Compra de vuelo simulada correctamente',
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

router.post('/hotel/:proposalId/reserve', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const proposalId = Number(req.params.proposalId);
    if (Number.isNaN(proposalId)) {
      res.status(400).json({ ok: false, error: 'proposalId invalido' });
      return;
    }

    const result = await CheckoutService.simulateHotelReservation(
      req.user!.id,
      proposalId,
      req.body as SimulatedCheckoutPayload,
    );

    res.status(200).json({
      ok: true,
      message: 'Reserva de hospedaje simulada correctamente',
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(getStatusCode(err)).json({ ok: false, error: msg });
  }
});

export default router;
