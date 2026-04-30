"""
Publication-quality figures for:
"When students draw everything: concept mapping of learning outcomes
 between compliance adaptation and cognitive hierarchy"

N_total = 12 sessions; N_complete = 11 (S2 excluded — no edges recorded).
Outlier of interest: S7 (Dunning-Kruger profile).

Run: python figures.py
Outputs: fig1_socratic.png, fig2_overconfidence.png, fig3_homophily.png,
         fig4_s4_radar.png, fig5_corr_heatmap.png, fig6_hypotheses.png
"""

import itertools
import warnings
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import TwoSlopeNorm
from scipy import stats

warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────────────────────────────────────
# Global style
# ─────────────────────────────────────────────────────────────────────────────
plt.rcParams.update({
    'font.family':       'DejaVu Sans',
    'font.size':         11,
    'axes.titlesize':    13,
    'axes.titleweight':  'semibold',
    'axes.labelsize':    11,
    'axes.labelweight':  'medium',
    'xtick.labelsize':   10,
    'ytick.labelsize':   10,
    'legend.fontsize':   10,
    'axes.spines.top':   False,
    'axes.spines.right': False,
    'axes.linewidth':    0.9,
    'xtick.major.width': 0.9,
    'ytick.major.width': 0.9,
    'xtick.major.size':  4,
    'ytick.major.size':  4,
    'axes.titlepad':     14,
    'axes.labelpad':     8,
    'figure.dpi':        300,
    'savefig.dpi':       300,
    'savefig.bbox':      'tight',
    'savefig.facecolor': 'white',
})

# Colorblind-safe palette (Wong, 2011)
C_BLUE    = '#0072B2'
C_ORANGE  = '#E69F00'
C_GREEN   = '#009E73'
C_RED     = '#D55E00'
C_PURPLE  = '#CC79A7'
C_LBLUE   = '#56B4E9'
C_GREY    = '#6E6E6E'
C_LGREY   = '#BDBDBD'

NaN = float('nan')

# ─────────────────────────────────────────────────────────────────────────────
# Data: N=12 sessions, S2 incomplete
# Columns: id, gpa, density, wgd, avg_w, ew_sd, avg_rat, sd_rat,
#          bridge, pt_sec, intra_avg, inter_avg, homophily
# ─────────────────────────────────────────────────────────────────────────────
RAW = [
    (1,  96.00, 1.000, 0.751, 2.25, 0.769, 4.93, 1.14, 0.890,  26.6, 2.68, 2.12, 0.57),
    (2,  96.00, NaN,   NaN,   NaN,  NaN,   5.71, 1.33, NaN,    NaN,  NaN,  NaN,  NaN ),
    (3,  93.00, 1.000, 0.645, 1.93, 0.800, 4.86, 1.51, 0.860,  29.7, 2.37, 1.82, 0.55),
    (4,  94.00, 1.000, 0.729, 2.19, 0.829, 5.36, 1.22, 0.820,  45.5, 2.89, 2.00, 0.89),
    (5,  93.00, 1.000, 0.630, 1.89, 0.781, 5.14, 0.95, 0.970,  20.6, 2.61, 1.71, 0.90),
    (6,  89.00, 1.000, 0.740, 2.22, 0.712, 4.71, 1.14, 0.950,  29.2, 2.36, 2.16, 0.20),
    (7,  93.00, 0.187, 0.077, 1.24, 0.437, 6.71, 0.47, 0.120, 114.8, 1.36, 1.00, 0.36),
    (8,  93.80, 1.000, 0.612, 1.84, 0.719, 5.64, 0.93, 0.910, 152.0, 2.36, 1.60, 0.75),
    (9,  88.51, 1.000, 0.601, 1.80, 0.833, 5.71, 1.14, 0.820,  77.5, 2.37, 1.65, 0.72),
    (10, 93.00, 1.000, 0.582, 1.75, 0.739, 4.71, 1.73, 0.770,  25.4, 2.08, 1.62, 0.46),
    (11, 90.00, 1.000, 0.451, 1.35, 0.584, 5.71, 1.20, 0.960, 166.6, 1.95, 1.18, 0.77),
    (12, 82.11, 0.835, 0.564, 2.03, 0.748, 5.71, 0.61, 0.610,  50.0, 2.36, 1.86, 0.50),
]

RAW       = np.array(RAW, dtype=float)
ids       = RAW[:, 0].astype(int)
gpa       = RAW[:, 1]
density   = RAW[:, 2]
wgd       = RAW[:, 3]
avg_w     = RAW[:, 4]
ew_sd     = RAW[:, 5]
avg_rat   = RAW[:, 6]
sd_rat    = RAW[:, 7]
bridge    = RAW[:, 8]
pt_sec    = RAW[:, 9]
intra_avg = RAW[:, 10]
inter_avg = RAW[:, 11]
homophily = RAW[:, 12]

complete = ~np.isnan(density)        # N = 11 (excludes S2)
DK       = 6                         # S7 index (0-based) — Dunning-Kruger profile

def spearman(x, y):
    return stats.spearmanr(x, y)

def fmt_rho(r, p, n):
    stars = '***' if p < .001 else '**' if p < .01 else '*' if p < .05 else ''
    return r'$\rho$ = %+.2f%s, $p$ = %.3f, N = %d' % (r, stars, p, n)


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 1 — Socratic effect: WGD vs. mean self-rating
# ═════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(7.0, 5.2))

c_idx  = np.where(complete)[0]
xd, yd = wgd[c_idx], avg_rat[c_idx]

# OLS lines for visual reference
x_grid = np.linspace(xd.min() - 0.05, xd.max() + 0.05, 200)
b1     = np.polyfit(xd, yd, 1)
ax.plot(x_grid, np.poly1d(b1)(x_grid), '--', color=C_GREY, lw=1.4, alpha=0.85,
        label='OLS fit, N = 11', zorder=2)

mask_ex = c_idx[ids[c_idx] != 7]
xex, yex = wgd[mask_ex], avg_rat[mask_ex]
b2 = np.polyfit(xex, yex, 1)
ax.plot(x_grid, np.poly1d(b2)(x_grid), '-', color=C_BLUE, lw=1.4, alpha=0.85,
        label='OLS fit, N = 10 (S7 excluded)', zorder=2)

# Scatter
for i in c_idx:
    is_dk = (i == DK)
    ax.scatter(wgd[i], avg_rat[i],
               s=160 if is_dk else 90,
               color=C_RED if is_dk else C_BLUE,
               edgecolor='white', linewidth=0.9, zorder=4)

# Manual label offsets (avoid overlap)
label_offsets = {
    1:  (0.014, +0.12),
    3:  (0.014, -0.22),
    4:  (0.014, +0.12),
    5:  (0.014, +0.12),
    6:  (0.014, -0.22),
    7:  (0.014, -0.06),
    8:  (-0.045, +0.18),
    9:  (0.014, +0.20),
    10: (0.014, -0.22),
    11: (-0.060, +0.12),
    12: (0.014, -0.22),
}
for i in c_idx:
    sid = int(ids[i])
    dx, dy = label_offsets.get(sid, (0.012, 0.10))
    ax.annotate('S%d' % sid,
                xy=(wgd[i], avg_rat[i]),
                xytext=(wgd[i] + dx, avg_rat[i] + dy),
                fontsize=9, fontweight='bold' if i == DK else 'normal',
                color=C_RED if i == DK else '#1F1F1F', zorder=5)

r_all, p_all = spearman(xd, yd)
r_ex,  p_ex  = spearman(xex, yex)

stat_text = ('All N = 11:        %s\nN = 10 (no S7):  %s'
             % (fmt_rho(r_all, p_all, len(c_idx)),
                fmt_rho(r_ex,  p_ex,  len(mask_ex))))
ax.text(0.985, 0.97, stat_text, transform=ax.transAxes, va='top', ha='right',
        fontsize=9.5, color='#222222', family='DejaVu Sans',
        bbox=dict(boxstyle='round,pad=0.45', fc='#F7F8FA', ec='#D0D5DD', lw=0.7))

ax.annotate('Dunning–Kruger profile',
            xy=(wgd[DK], avg_rat[DK]),
            xytext=(0.18, 7.10),
            fontsize=9.5, color=C_RED, ha='left',
            arrowprops=dict(arrowstyle='->', color=C_RED, lw=1.3))

ax.set_xlabel('Weighted graph density (WGD)')
ax.set_ylabel('Mean self-rated competence (1–7)')
ax.set_title('Figure 1.  Socratic effect:\nhigher map integration → lower self-rating')
ax.set_xlim(-0.04, 0.88)
ax.set_ylim(4.2, 7.4)
ax.grid(axis='both', linestyle=':', linewidth=0.6, color=C_LGREY, alpha=0.7)
ax.set_axisbelow(True)
ax.legend(loc='lower left', frameon=False)

plt.tight_layout()
plt.savefig('fig1_socratic.png')
plt.close()
print('saved fig1_socratic.png')


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 2 — Confidence penalty: mean self-rating vs. perturbation time
# ═════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(7.0, 5.2))

xd, yd = avg_rat[c_idx], pt_sec[c_idx]
b3 = np.polyfit(xd, yd, 1)
x_grid = np.linspace(xd.min() - 0.15, xd.max() + 0.15, 200)
ax.plot(x_grid, np.poly1d(b3)(x_grid), '--', color=C_GREY, lw=1.4, alpha=0.85,
        label='OLS fit, N = 11', zorder=2)

for i in c_idx:
    is_dk = (i == DK)
    ax.scatter(avg_rat[i], pt_sec[i],
               s=160 if is_dk else 90,
               color=C_RED if is_dk else C_ORANGE,
               edgecolor='white', linewidth=0.9, zorder=4)

label_offsets2 = {
    1: (0.04, +6),  3: (-0.18, -10), 4: (0.04, +6),  5: (0.04, +6),
    6: (-0.16, +6), 7: (-0.30, -14), 8: (0.04, -12), 9: (0.04, +6),
    10: (-0.20, +6), 11: (-0.30, +6), 12: (0.04, +6),
}
for i in c_idx:
    sid = int(ids[i])
    dx, dy = label_offsets2.get(sid, (0.04, 6))
    ax.annotate('S%d' % sid,
                xy=(avg_rat[i], pt_sec[i]),
                xytext=(avg_rat[i] + dx, pt_sec[i] + dy),
                fontsize=9, fontweight='bold' if i == DK else 'normal',
                color=C_RED if i == DK else '#1F1F1F', zorder=5)

r3, p3 = spearman(xd, yd)
ax.text(0.025, 0.97, fmt_rho(r3, p3, len(c_idx)),
        transform=ax.transAxes, va='top', fontsize=10, color='#222222',
        bbox=dict(boxstyle='round,pad=0.45', fc='#F7F8FA', ec='#D0D5DD', lw=0.7))

ax.annotate('S7: fast,\nlowest accuracy\n(bridge = 0.12)',
            xy=(avg_rat[DK], pt_sec[DK]),
            xytext=(5.85, 145),
            fontsize=9, color=C_RED,
            arrowprops=dict(arrowstyle='->', color=C_RED, lw=1.3))

ax.set_xlabel('Mean self-rated competence (1–7)')
ax.set_ylabel('Mean perturbation decision time (s)')
ax.set_title('Figure 2.  Confidence penalty:\nhigher self-rating → longer perturbation time')
ax.set_xlim(4.4, 7.0)
ax.set_ylim(0, 200)
ax.grid(axis='both', linestyle=':', linewidth=0.6, color=C_LGREY, alpha=0.7)
ax.set_axisbelow(True)
ax.legend(loc='lower right', frameon=False)

plt.tight_layout()
plt.savefig('fig2_overconfidence.png')
plt.close()
print('saved fig2_overconfidence.png')


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 3 — Cluster homophily: intra vs inter mean edge weight per student
# ═════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(9.5, 5.2))

idx_ok   = np.where(complete)[0]
ids_ok   = ids[idx_ok]
intra_ok = intra_avg[idx_ok]
inter_ok = inter_avg[idx_ok]
dk_local = int(np.where(idx_ok == DK)[0][0])

x = np.arange(len(idx_ok))
w = 0.36

ax.bar(x - w/2, intra_ok, w, label='Within-cluster edges',
       color=C_BLUE,  alpha=0.92, edgecolor='white', linewidth=0.6)
ax.bar(x + w/2, inter_ok, w, label='Between-cluster edges',
       color=C_LBLUE, alpha=0.92, edgecolor='white', linewidth=0.6)

ymax_global = float(max(intra_ok.max(), inter_ok.max()))
for i in range(len(idx_ok)):
    delta = intra_ok[i] - inter_ok[i]
    ymax  = max(intra_ok[i], inter_ok[i])
    ax.annotate(r'$\Delta$ = %.2f' % delta,
                xy=(x[i], ymax + 0.08),
                ha='center', fontsize=9,
                color=C_RED if i == dk_local else '#222222',
                fontweight='bold' if i == dk_local else 'medium')

# Highlight S7
ax.axvspan(x[dk_local] - 0.5, x[dk_local] + 0.5,
           alpha=0.10, color=C_RED, zorder=0)

ax.set_xticks(x)
ax.set_xticklabels(['S%d' % i for i in ids_ok])
ax.set_xlabel('Participant')
ax.set_ylabel('Mean edge weight (1–3)')
ax.set_title('Figure 3.  Cluster homophily:\nall participants weight within-cluster edges higher than between-cluster edges')
ax.set_ylim(0, ymax_global + 0.7)
for yy in [1, 2, 3]:
    ax.axhline(y=yy, color=C_LGREY, lw=0.6, ls=':', alpha=0.7)
ax.grid(axis='y', linestyle=':', linewidth=0.6, color=C_LGREY, alpha=0.5)
ax.set_axisbelow(True)
ax.legend(loc='upper right', frameon=False, ncol=2)

plt.tight_layout()
plt.savefig('fig3_homophily.png')
plt.close()
print('saved fig3_homophily.png')


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 4 — S7 radar: outlier profile vs. group median
# ═════════════════════════════════════════════════════════════════════════════
def norm01(arr):
    arr = np.array(arr, dtype=float)
    mn, mx = np.nanmin(arr), np.nanmax(arr)
    if mx == mn:
        return np.zeros_like(arr)
    return (arr - mn) / (mx - mn)

idx_ok    = np.where(complete)[0]
density_c = density[idx_ok]
wgd_c     = wgd[idx_ok]
bridge_c  = bridge[idx_ok]
avg_rat_c = avg_rat[idx_ok]
avg_w_c   = avg_w[idx_ok]
ew_sd_c   = ew_sd[idx_ok]
dk_c      = int(np.where(idx_ok == DK)[0][0])

vars_labels = [
    'Density',
    'Integration\n(WGD)',
    'Bridge\naccuracy',
    'Mean edge\nweight',
    'Hierarchy\n(SD of weights)',
    'Self-rated\ncompetence',
]
raw_mat = np.column_stack([
    density_c,
    wgd_c,
    bridge_c,
    avg_w_c,
    ew_sd_c,
    avg_rat_c,
])
data_norm = np.apply_along_axis(
    lambda c: (c - c.min()) / (c.max() - c.min()) if c.max() != c.min() else c,
    0, raw_mat)

s7_vals  = data_norm[dk_c]
rest_med = np.median(data_norm[np.arange(len(idx_ok)) != dk_c], axis=0)

N_vars = len(vars_labels)
angles = np.linspace(0, 2 * np.pi, N_vars, endpoint=False).tolist()
angles += angles[:1]
s7_plot   = list(s7_vals)  + [s7_vals[0]]
rest_plot = list(rest_med) + [rest_med[0]]

fig, ax = plt.subplots(figsize=(6.6, 6.6), subplot_kw=dict(polar=True))
ax.plot(angles, rest_plot, 's--', lw=1.6, color=C_BLUE, label='Median of N = 10 (S2 & S7 excluded)', markersize=5)
ax.fill(angles, rest_plot, alpha=0.10, color=C_BLUE)
ax.plot(angles, s7_plot,   'o-',  lw=2.2, color=C_RED, label='S7', markersize=6)
ax.fill(angles, s7_plot,   alpha=0.22, color=C_RED)

ax.set_xticks(angles[:-1])
ax.set_xticklabels(vars_labels, size=10)
ax.set_ylim(0, 1.05)
ax.set_yticks([0.25, 0.5, 0.75, 1.0])
ax.set_yticklabels(['0.25', '0.50', '0.75', '1.00'], size=8.5, color=C_GREY)
ax.set_title('Figure 4.  S7 profile vs. group median  (per-axis min–max normalised)', pad=30)
ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.06), frameon=False, ncol=2)
ax.grid(color=C_LGREY, ls='--', lw=0.6, alpha=0.7)
ax.spines['polar'].set_visible(False)

plt.tight_layout()
plt.savefig('fig4_s4_radar.png')
plt.close()
print('saved fig4_s4_radar.png')


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 5 — Spearman correlation matrix (lower triangle), N = 11
# ═════════════════════════════════════════════════════════════════════════════
c_idx     = np.where(complete)[0]
var_names = ['GPA', 'Density', 'WGD', 'avgWeight', 'edgeWeightSD',
             'avgRating', 'bridgeAcc', 'perturbTime', 'homophily']
data_matrix = np.column_stack([
    gpa[c_idx], density[c_idx], wgd[c_idx], avg_w[c_idx], ew_sd[c_idx],
    avg_rat[c_idx], bridge[c_idx], pt_sec[c_idx], homophily[c_idx]
])
n_vars = len(var_names)
corr   = np.zeros((n_vars, n_vars))
pval   = np.ones((n_vars, n_vars))
for i, j in itertools.product(range(n_vars), range(n_vars)):
    if i == j:
        corr[i, j] = 1.0
    else:
        r, p = stats.spearmanr(data_matrix[:, i], data_matrix[:, j])
        corr[i, j] = r
        pval[i, j] = p

# Mask upper triangle for cleaner read
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
corr_show = np.ma.array(corr, mask=mask)

fig, ax = plt.subplots(figsize=(8.4, 7.2))
norm = TwoSlopeNorm(vmin=-1, vcenter=0, vmax=1)
cmap = plt.get_cmap('RdBu_r').copy()
cmap.set_bad(color='white')
im = ax.imshow(corr_show, cmap=cmap, norm=norm, aspect='auto')

for i in range(n_vars):
    for j in range(n_vars):
        if mask[i, j]:
            continue
        r = corr[i, j]; p = pval[i, j]
        star = '**' if (i != j and p < .01) else '*' if (i != j and p < .05) else ''
        color = 'white' if abs(r) > 0.55 else '#1F1F1F'
        ax.text(j, i, '%.2f%s' % (r, star), ha='center', va='center',
                fontsize=10, color=color,
                fontweight='bold' if abs(r) > 0.5 else 'normal')

ax.set_xticks(range(n_vars))
ax.set_yticks(range(n_vars))
ax.set_xticklabels(var_names, rotation=35, ha='right')
ax.set_yticklabels(var_names)
ax.set_title('Figure 5.  Spearman rank-correlation matrix, N = 11\n* p < .05,  ** p < .01  (uncorrected)')

# Hide spines and ticks for clean grid
for s in ax.spines.values():
    s.set_visible(False)
ax.tick_params(length=0)

cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
cbar.set_label(r'Spearman $\rho$')
cbar.ax.tick_params(labelsize=9)

plt.tight_layout()
plt.savefig('fig5_corr_heatmap.png')
plt.close()
print('saved fig5_corr_heatmap.png')


# ═════════════════════════════════════════════════════════════════════════════
# FIGURE 6 — Hypothesis summary: observed rho (N = 11)
# ═════════════════════════════════════════════════════════════════════════════
hyp_labels = [
    'H1a:  GPA  →  WGD',
    'H1b:  GPA  →  density',
    'H1c:  GPA  →  avgWeight',
    'H2:    density  →  avgWeight',
    'H3:    GPA  →  edgeWeightSD',
    'H5:    edgeWeightSD  →  bridgeAcc',
    'EDA:  WGD  →  avgRating',
    'EDA:  avgRating  →  perturbTime',
]
exp_signs  = ['≈ 0', '+', '−', '−', '−', '+', 'EDA', 'EDA']
obs_rho    = [+0.465, +0.304, +0.228, +0.270, +0.107, -0.032, -0.690, +0.772]
obs_p      = [ 0.153,  0.389,  0.497,  0.431,  0.753,  0.925,  0.023,  0.008]
exp_rho    = [  0.0,    0.5,   -0.5,   -0.5,   -0.5,    0.5,   None,   None]

colors_bar = []
for obs, exp in zip(obs_rho, exp_rho):
    if exp is None:
        colors_bar.append(C_GREEN)
    elif exp == 0:
        colors_bar.append(C_ORANGE if abs(obs) > 0.3 else C_BLUE)
    elif np.sign(obs) == np.sign(exp):
        colors_bar.append(C_BLUE)
    else:
        colors_bar.append(C_RED)

fig, ax = plt.subplots(figsize=(11.0, 6.4))
y = np.arange(len(hyp_labels))[::-1]
# Build composite y-tick labels: hypothesis (left) + expected sign tag (right column shown via separate annotation)
ax.barh(y, obs_rho, color=colors_bar, alpha=0.92,
        edgecolor='white', height=0.6)

for yi, obs, p in zip(y, obs_rho, obs_p):
    star = '**' if p < .01 else '*' if p < .05 else ''
    xpos = obs + (0.022 if obs >= 0 else -0.022)
    ha   = 'left' if obs >= 0 else 'right'
    ax.text(xpos, yi, '%+.3f%s' % (obs, star),
            va='center', ha=ha, fontsize=10.5, fontweight='bold')

ax.axvline(0,    color='black', lw=0.9)
ax.axvline(-0.5, color=C_LGREY, lw=0.6, ls=':', alpha=0.8)
ax.axvline(+0.5, color=C_LGREY, lw=0.6, ls=':', alpha=0.8)

# Compose label with expected sign annotation
labels_with_exp = ['%s   [exp.: %s]' % (lab, exp)
                   for lab, exp in zip(hyp_labels, exp_signs)]
ax.set_yticks(y)
ax.set_yticklabels(labels_with_exp, fontsize=10)

ax.set_xlabel(r'Spearman $\rho$  (permutation test, $n_\mathrm{resample}$ = 9 999)')
ax.set_title('Figure 6.  Pre-specified hypotheses and exploratory findings (N = 11)')
ax.set_xlim(-1.05, 1.05)

legend = [
    mpatches.Patch(color=C_BLUE,   label='Direction confirmed'),
    mpatches.Patch(color=C_RED,    label='Opposite sign'),
    mpatches.Patch(color=C_ORANGE, label='Departure from H1a (≈ 0)'),
    mpatches.Patch(color=C_GREEN,  label='Exploratory (EDA)'),
]
ax.legend(handles=legend, frameon=False,
          loc='upper center', bbox_to_anchor=(0.5, -0.12), ncol=4)
ax.grid(axis='x', linestyle=':', linewidth=0.6, color=C_LGREY, alpha=0.6)
ax.set_axisbelow(True)

plt.tight_layout()
plt.savefig('fig6_hypotheses.png')
plt.close()
print('saved fig6_hypotheses.png')

print('\nAll figures saved.  N_total = 12,  N_complete = 11 (S2 excluded),  outlier = S7')
