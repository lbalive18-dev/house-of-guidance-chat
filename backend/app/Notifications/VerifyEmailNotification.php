<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends BaseVerifyEmail
{
    /**
     * Build a signed verification URL that points at the Laravel API
     * (so the signature/hash validate), which the frontend link then
     * calls on the user's behalf after they click through from email.
     */
    protected function verificationUrl($notifiable): string
    {
        $signedApiUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        $frontendUrl = rtrim(config('app.frontend_url'), '/').'/verify-email';

        return $frontendUrl.'?verify_url='.urlencode($signedApiUrl);
    }

    public function toMail($notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        // Typed-code fallback for the same email: link-clicking breaks on
        // some in-app browsers and tracker rewrites, but a code typed into
        // the app always works. Issued fresh with every send; expires fast.
        $code = \App\Models\EmailVerificationCode::issueFor($notifiable->getEmailForVerification());

        return (new MailMessage)
            ->subject('Verify your House of Guidance Chat email')
            ->greeting('As-salamu alaykum, '.$notifiable->name.'!')
            ->line('Please confirm your email address to finish setting up your House of Guidance Chat account.')
            ->action('Verify Email Address', $url)
            ->line('If the button does not work, open the app, go to Verify Email, and enter this code instead: '.$code)
            ->line('The code expires in 30 minutes. If you did not create an account, no further action is required.');
    }
}
