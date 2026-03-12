-- Attach notify_admin_on_error trigger to feedback and support_tickets tables

-- 1. Feedback triggers
DROP TRIGGER IF EXISTS on_feedback_inserted ON public.feedback;
CREATE TRIGGER on_feedback_inserted
    AFTER INSERT ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_error();

-- 2. Support Tickets triggers
DROP TRIGGER IF EXISTS on_support_ticket_inserted ON public.support_tickets;
CREATE TRIGGER on_support_ticket_inserted
    AFTER INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_error();
