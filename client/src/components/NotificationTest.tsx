import { LocalNotifications } from '@capacitor/local-notifications';
import { Button } from '@/components/ui/button';

export function NotificationTest() {
  const testNotification = async () => {
    try {
      console.log('🧪 TEST: Requesting permissions...');
      const permission = await LocalNotifications.requestPermissions();
      console.log('🧪 TEST: Permission result:', permission);
      
      if (permission.display !== 'granted') {
        alert('Permission denied: ' + permission.display);
        return;
      }

      const scheduleTime = new Date(Date.now() + 10000); // 10 seconds from now
      console.log('🧪 TEST: Scheduling notification for:', scheduleTime);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "TEST NOTIFICATION",
            body: "If you see this, notifications work!",
            id: 999999,
            schedule: { at: scheduleTime },
            sound: 'default',
          }
        ]
      });

      console.log('🧪 TEST: Notification scheduled successfully!');
      alert('✅ Test notification scheduled for 10 seconds from now!\n\nClose the app and wait...');

    } catch (error) {
      console.error('🧪 TEST ERROR:', error);
      alert('❌ ERROR: ' + error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={testNotification}
        className="bg-purple-600 hover:bg-purple-700"
        data-testid="button-test-notification"
      >
        🧪 Test Notification
      </Button>
    </div>
  );
}
