import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { CrApiService } from '../../api/cr-api.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentRef.setInput('id', id);
	fixture.detectChanges(); // ngOnChanges -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('loads the new change request when the id input changes', async () => {
		const fixture = await render(users.approver, 'CR-1');

		fixture.componentRef.setInput('id', 'CR-2');
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Replace SKU-B supplier');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('approves a pending change request', async () => {
		const fixture = await render(users.approver, 'CR-1');

		await fixture.componentInstance.approve();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('APPROVED');
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
	});

	it('requires a rejection reason', async () => {
		const fixture = await render(users.approver, 'CR-1');

		await fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
		expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).not.toBeNull();
	});

	it('rejects a pending change request with a reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.setValue('The quantity is too high.');

		await fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('REJECTED');
		expect(fixture.componentInstance.timeline.at(-1)?.note).toBe('The quantity is too high.');
		expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
	});

	it('prevents duplicate approval while the API is slow', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 100;
		const approveSpy = jest.spyOn(api, 'approve');

		const firstApproval = fixture.componentInstance.approve();
		const secondApproval = fixture.componentInstance.approve();
		fixture.detectChanges();

		const approveButton: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(fixture.componentInstance.submitting).toBe(true);
		expect(approveButton.disabled).toBe(true);
		expect(approveSpy).toHaveBeenCalledTimes(1);

		await firstApproval;
		await secondApproval;
		fixture.detectChanges();

		expect(fixture.componentInstance.submitting).toBe(false);
		expect(fixture.componentInstance.detail?.status).toBe('APPROVED');
	});
});
