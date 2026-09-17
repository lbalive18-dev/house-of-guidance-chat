<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * Sends mail through the Brevo HTTPS REST API instead of SMTP.
 *
 * Render's free tier blocks outbound SMTP ports (25/465/587), so the
 * smtp mailer cannot work there. This transport posts to
 * https://api.brevo.com/v3/smtp/email over port 443 using only the
 * BREVO_API_KEY / BREVO_API_URL environment variables — credentials
 * are never hard-coded. Selected with MAIL_MAILER=brevo-api.
 */
class BrevoApiTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $apiBaseUrl = 'https://api.brevo.com/v3',
        private readonly int $timeoutSeconds = 15,
    ) {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'brevo-api';
    }

    protected function doSend(SentMessage $message): void
    {
        $email = $message->getOriginalMessage();

        if (! $email instanceof Email) {
            throw new TransportException('Brevo API transport only supports Email messages.');
        }

        $from = $email->getFrom();
        if ($from === []) {
            throw new TransportException('Brevo API transport requires a sender address.');
        }

        $payload = array_filter([
            'sender' => $this->formatAddress($from[0]),
            'to' => array_map($this->formatAddress(...), $email->getTo()),
            'cc' => $this->formatAddresses($email->getCc()),
            'bcc' => $this->formatAddresses($email->getBcc()),
            'replyTo' => $this->formatAddress($email->getReplyTo()[0] ?? null),
            'subject' => $email->getSubject(),
            'htmlContent' => $email->getHtmlBody(),
            'textContent' => $email->getTextBody() ?? ($email->getHtmlBody() === null ? '(empty)' : null),
            'attachment' => $this->formatAttachments($email),
        ]);

        $response = Http::timeout($this->timeoutSeconds)
            ->withHeaders(['api-key' => $this->apiKey, 'Accept' => 'application/json'])
            ->post(rtrim($this->apiBaseUrl, '/').'/smtp/email', $payload);

        if (! $response->successful()) {
            throw new TransportException(
                'Brevo API rejected the message (HTTP '.$response->status().').'
            );
        }
    }

    private function formatAddress(?Address $address): ?array
    {
        if ($address === null) {
            return null;
        }

        $formatted = ['email' => $address->getAddress()];

        if ($address->getName() !== '') {
            $formatted['name'] = $address->getName();
        }

        return $formatted;
    }

    /** @param Address[] $addresses */
    private function formatAddresses(array $addresses): ?array
    {
        if ($addresses === []) {
            return null;
        }

        return array_map($this->formatAddress(...), $addresses);
    }

    private function formatAttachments(Email $email): ?array
    {
        $attachments = [];

        foreach ($email->getAttachments() as $attachment) {
            $attachments[] = [
                'content' => base64_encode($attachment->bodyToString()),
                'name' => $attachment->getPreparedHeaders()->get('content-disposition')?->getParameter('filename')
                    ?? 'attachment',
            ];
        }

        return $attachments === [] ? null : $attachments;
    }
}
